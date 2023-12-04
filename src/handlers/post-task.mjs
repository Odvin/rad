import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, PutCommand} from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.SAMPLE_TABLE;

import selector from '../services/Selector.mjs';

import logger from '../aws-services/logger.mjs';
import tracer from '../aws-services/tracer.mjs';

export const handler = async (event) => {
  logger.info('Post task for recommendation activated');

  const segment = tracer.getSegment();
  const subsegment = segment.addNewSubsegment(`## ${process.env._HANDLER}`);
  tracer.setSegment(subsegment);
  tracer.annotateColdStart();
  tracer.addServiceNameAnnotation();

  try {
    const task = JSON.parse(event.body);

    const id = task.operationKey;
    const recommendation = await selector.processTask(task);

    var params = {
      TableName: tableName,
      Item: {id: id, recommendation},
    };

    await ddbDocClient.send(new PutCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify(recommendation),
    };
  } catch (err) {
    logger.error('Error', err.stack);
  } finally {
    subsegment.close();
    tracer.setSegment(segment);
  }
};
