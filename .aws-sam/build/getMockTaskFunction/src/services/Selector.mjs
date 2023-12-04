import eventBridgeClient from '../aws-services/EventBridgeClient.mjs';

class Selector {
  constructor(eventBridgeClient) {
    this.event = eventBridgeClient;

    this.skillWeight = 1.5;
    this.certificationWeight = 1.4;
    this.availabilityWeight = 1.6;
    this.productivityWeight = 1.7;
  }

  getDistance(lat1, lon1, lat2, lon2, unit = 'M') {
    if (lat1 == lat2 && lon1 == lon2) {
      return 0;
    } else {
      const radLat1 = (Math.PI * lat1) / 180;
      const radLat2 = (Math.PI * lat2) / 180;
      const theta = lon1 - lon2;
      const radTheta = (Math.PI * theta) / 180;
      let dist =
        Math.sin(radLat1) * Math.sin(radLat2) +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta);

      if (dist > 1) {
        dist = 1;
      }

      dist = Math.acos(dist);
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515;

      if (unit == 'K') {
        dist = dist * 1.609344;
      }

      if (unit == 'N') {
        dist = dist * 0.8684;
      }

      return dist;
    }
  }

  selectRequired(presentedParams, requiredParams) {
    const res = [];
    if (presentedParams.length == 0 || requiredParams.length == 0) {
      return res;
    }

    const param = requiredParams[0].skill ? 'skill' : 'certification';

    const requiredListOfParams = requiredParams.map((i) => i[param]);

    for (const p of presentedParams) {
      if (requiredListOfParams.includes(p[param])) {
        const {weight, required} = requiredParams.find(
          (r) => r[param] === p[param]
        );
        res.push({...p, weight, required});
      }
    }

    return res;
  }

  // s * sum (exp(-(n_0j-n_ij) * s_j) + c * sum (exp(-(p_0j-p_ij) * c_j)
  calculateCompetence(skills, certifications) {
    return (
      this.skillWeight *
        skills.reduce((sum, j) => {
          return sum + Math.exp(-Math.abs(j.total - j.required)) * j.weight;
        }, 0) +
      this.certificationWeight *
        certifications.reduce((sum, j) => {
          return sum + Math.exp(-Math.abs(j.total - j.required)) * j.weight;
        }, 0)
    );
  }

  // d * 100/distance
  calculateAvailability(distance) {
    if (distance == 0) {
      return 1;
    }
    return (this.availabilityWeight * 100) / distance;
  }

  // p * jobW * (crC * ln(crR) + comC/10 * ln(comR))/jobV
  calculateProductivity(crew, company, jobVolume) {
    return (
      (this.productivityWeight *
        jobVolume.weight *
        (crew.capacity * Math.log(crew.rating) +
          (company.capacity / 10) * Math.log(company.rating))) /
      jobVolume.capacity
    );
  }

  calculateTotal(competence, availability, productivity) {
    return Math.sqrt(
      (1 + competence) * (1 + availability) * (1 + productivity)
    );
  }

  getTaskRecommendationEventPayload(task) {
    const cReq = (requeued) => {
      return requeued.reduce((s, c) => {
        return s + c.required;
      }, 0);
    };

    return {
      operationKey: task.operationKey,
      projectId: task.objective.project.id,
      projectName: task.objective.project.name,
      siteId: task.objective.site.id,
      city: task.objective.site.city,
      latitude: task.objective.site.location.latitude,
      longitude: task.objective.site.location.longitude,
      siteName: task.objective.site.name,
      siteType: task.objective.site.type,
      jobId: task.objective.job.id,
      jobName: task.objective.job.name,
      jobCapacity: task.objective.job.volume.capacity,
      requiredSkills: cReq(task.objective.job.requiredSkills),
      requiredCertifications: cReq(task.objective.job.requiredCertifications),
      selectCrews: task.objective.selectCrews,
    };
  }

  getCrewRecommendedEventPayload(project, o) {
    const cReq = (requeued) => {
      return requeued.reduce((s, c) => {
        return s + c.total;
      }, 0);
    };

    return {
      operationKey: project.operationKey,
      projectId: project.projectId,
      siteId: project.siteId,
      jobId: project.jobId,
      companyId: o.company.id,
      companyName: o.company.name,
      crewId: o.crew.info.id,
      city: o.crew.info.city,
      crewName: o.crew.info.name,
      latitude: o.crew.location.latitude,
      longitude: o.crew.location.longitude,
      skills: o.crew.skills.length,
      skilledMembers: cReq(o.crew.skills),
      certifications: o.crew.certifications.length,
      certifiedMembers: cReq(o.crew.certifications),
      distanceToSite: o.crew.distance,
      capacity: o.crew.capacity,
      rating: o.crew.rating,
      score: o.score.total,
      availability: o.score.availability,
      competence: o.score.competence,
      productivity: o.score.productivity,
    };
  }

  async processTask(task) {
    let options = [];

    const taskRecommendation = this.getTaskRecommendationEventPayload(task);

    await this.event.emit({
      DetailType: 'task-recommendation',
      Detail: taskRecommendation,
    });

    for (const o of task.options) {
      const company = o.company;
      for (const c of o.crews) {
        options.push({
          company,
          crew: {
            info: c.info,
            location: c.location,
            distance: this.getDistance(
              c.location.latitude,
              c.location.longitude,
              task.objective.site.location.latitude,
              task.objective.site.location.longitude,
              'K'
            ),
            capacity: c.capacity,
            rating: c.rating,
            skills: this.selectRequired(
              c.skills,
              task.objective.job.requiredSkills
            ),
            certifications: this.selectRequired(
              c.certifications,
              task.objective.job.requiredCertifications
            ),
          },
        });
      }
    }

    options = options.map((o) => {
      const competence = this.calculateCompetence(
        o.crew.skills,
        o.crew.certifications
      );

      const availability = this.calculateAvailability(o.crew.distance);

      const productivity = this.calculateProductivity(
        o.crew,
        o.company,
        task.objective.job.volume
      );

      const total = this.calculateTotal(competence, availability, productivity);

      const score = {
        total,
        availability,
        competence,
        productivity,
      };

      return {...o, score};
    });

    for (const option of options) {
      const crewRecommended = this.getCrewRecommendedEventPayload(
        taskRecommendation,
        option
      );

      await this.event.emit({
        DetailType: 'crew-recommended',
        Detail: crewRecommended,
      });
    }

    const n = task.objective.selectCrews;
    const scores = new Array(n).fill(0);
    const selected = new Array(n).fill({});

    for (const o of options) {
      let s = o.score.total;
      for (let i = 0; i < n; i++) {
        if (s > scores[i]) {
          for (let j = 1; j < n - i; j++) {
            scores[n - j] = scores[n - j - 1];
            selected[n - j] = selected[n - j - 1];
          }
          scores[i] = s;
          selected[i] = o;
          break;
        }
      }
    }

    return {
      project: task.objective.project,
      site: task.objective.site,
      job: task.objective.job,
      options: selected,
      operationKey: task.operationKey,
    };
  }
}

export default new Selector(eventBridgeClient);
