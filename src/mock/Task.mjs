import * as fs from 'fs';

import {faker} from '@faker-js/faker';

import companies from './companies.json' assert {type: 'json'};
import siteType from './siteType.json' assert {type: 'json'};
import siteEnvironment from './siteEnvironment.json' assert {type: 'json'};
import skills from './skills.json' assert {type: 'json'};
import certifications from './certifications.json' assert {type: 'json'};

// import selector from '../services/Selector.mjs';

class Task {
  getProject() {
    return {
      id: faker.string.uuid(),
      name: faker.company.catchPhrase(),
      country: faker.location.countryCode('alpha-2'),
    };
  }

  getSite() {
    return {
      id: faker.string.uuid(),
      city: faker.location.city(),
      region: faker.location.country(),
      location: {
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
      },
      name: faker.company.name(),
      type: faker.helpers.arrayElement(siteType),
      environment: faker.helpers.arrayElement(siteEnvironment),
    };
  }

  getJob() {
    let capacityCounter = 0;

    const reqSkillsSet = new Set();
    const s = faker.number.int(7);
    for (let i = 0; i < s; i++) {
      reqSkillsSet.add(faker.helpers.arrayElement(skills));
    }

    const requiredSkills = [];

    for (let skill of reqSkillsSet) {
      let required = faker.number.int({min: 1, max: 7});

      requiredSkills.push({
        skill,
        required,
        weight: faker.number.float({min: 1, max: 2, precision: 0.001}),
      });

      capacityCounter += required;
    }

    const reqCertificationsSet = new Set();
    const c = faker.number.int(5);
    for (let i = 0; i < c; i++) {
      reqCertificationsSet.add(faker.helpers.arrayElement(certifications));
    }

    const requiredCertifications = [];

    for (let certification of reqCertificationsSet) {
      let required = faker.number.int({min: 1, max: 7});

      requiredCertifications.push({
        certification,
        required,
        weight: faker.number.float({min: 1, max: 2, precision: 0.001}),
      });

      capacityCounter += required;
    }

    return {
      id: faker.string.uuid(),
      name: faker.hacker.adjective(),
      volume: {
        capacity: capacityCounter + faker.number.int({min: 1, max: 20}),
        weight: faker.number.float({min: 1, max: 2, precision: 0.001}),
      },
      requiredSkills,
      requiredCertifications,
    };
  }

  getObjective() {
    return {
      project: this.getProject(),
      site: this.getSite(),
      job: this.getJob(),
      selectCrews: faker.number.int({min: 1, max: 3}),
    };
  }

  getCompanies(n) {
    const uniqueCompanies = [];
    const companyIds = [];

    while (uniqueCompanies.length < n) {
      let company = faker.helpers.arrayElement(companies);

      if (!companyIds.includes(company.id)) {
        companyIds.push(company.id);
        uniqueCompanies.push(company);
      }

      if (uniqueCompanies.length === companies.length) {
        break;
      }
    }

    return uniqueCompanies;
  }

  generateCompanies(n) {
    const companies = [];

    for (let i = 0; i < n; i++) {
      companies.push({
        id: faker.string.uuid(),
        name: faker.company.name(),
        country: faker.location.countryCode('alpha-2'),
        capacity: faker.number.int({min: 50, max: 200}),
        rating: faker.number.float({min: 1, max: 2, precision: 0.001}),
      });
    }

    return JSON.stringify(companies);
  }

  getCrews(n) {
    const crews = [];

    for (let i = 0; i < n; i++) {
      let capacityCounter = 0;

      let presentedSkillsSet = new Set();

      let s = faker.number.int(5);
      for (let j = 0; j < s; j++) {
        presentedSkillsSet.add(faker.helpers.arrayElement(skills));
      }

      let presentedSkills = [];

      for (let skill of presentedSkillsSet) {
        let total = faker.number.int({min: 1, max: 5});

        presentedSkills.push({
          skill,
          total,
        });

        capacityCounter += total;
      }

      let presentedCertificationsSet = new Set();

      let c = faker.number.int(5);
      for (let j = 0; j < c; j++) {
        presentedCertificationsSet.add(
          faker.helpers.arrayElement(certifications)
        );
      }

      let presentedCertifications = [];

      for (let certification of presentedCertificationsSet) {
        let total = faker.number.int({min: 1, max: 5});

        presentedCertifications.push({
          certification,
          total,
        });

        capacityCounter += total;
      }

      crews.push({
        info: {
          id: faker.string.uuid(),
          name: faker.company.name(),
          city: faker.location.city(),
          region: faker.location.country(),
        },
        location: {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        },
        skills: presentedSkills,
        certifications: presentedCertifications,
        capacity: capacityCounter + faker.number.int({min: 1, max: 5}),
        rating: faker.number.float({min: 1, max: 2, precision: 0.001}),
      });
    }

    return crews;
  }

  getOptions() {
    const o = faker.number.int({min: 1, max: 20});
    const companies = this.getCompanies(o);

    return companies.map((company) => {
      let c = faker.number.int({min: 1, max: 20});
      return {
        company,
        crews: this.getCrews(c),
      };
    });
  }

  create() {
    return {
      objective: this.getObjective(),
      options: this.getOptions(),
      operationKey: faker.string.uuid(),
    };
  }

  saveTask() {
    // Save example of the task to the file
    try {
      fs.writeFileSync('task.json', JSON.stringify(this.create()));
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export default new Task();

// const task = new Task();

// console.log(JSON.stringify(task.create(), null, 4));

// selector.processTask(task.create());

// task.saveTask();
