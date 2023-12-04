import {EventBridgeClient, PutEventsCommand} from '@aws-sdk/client-eventbridge';
import tracer from './tracer.mjs';

if (
  process.env.REGISTRY_NAME === undefined ||
  process.env.EVENT_BUS_NAME === undefined
) {
  throw Error('REGISTRY_NAME or EVENT_BUS_NAME is undefined');
}

if (process.env.REGION === undefined) {
  throw Error('EventBridge Service :: REGION is undefined');
}

const region = process.env.REGION;

export class EventBridgeService {
  constructor(region, eventBusName, source) {
    this.region = region;
    this.eventBusName = eventBusName;
    this.source = source;

    this.client = new EventBridgeClient({region: this.region});
    tracer.captureAWSv3Client(this.client);
  }

  async emit(event) {
    const input = {
      Entries: [
        {
          EventBusName: this.eventBusName,
          Source: this.source,
          DetailType: event.DetailType,
          Time: new Date(),
          Detail: JSON.stringify(event.Detail),
        },
      ],
    };

    const command = new PutEventsCommand(input);
    return this.client.send(command);
  }
}

export default new EventBridgeService(
  region,
  process.env.EVENT_BUS_NAME,
  process.env.REGISTRY_NAME
);
