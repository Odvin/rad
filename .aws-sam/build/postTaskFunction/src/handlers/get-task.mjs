import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, GetCommand} from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.SAMPLE_TABLE;

export const handler = async (event) => {
  try {
    const id = event.pathParameters.id;

    const params = {
      TableName: tableName,
      Key: {id: id},
    };

    const data = await ddbDocClient.send(new GetCommand(params));
    const {recommendation} = data.Item;

    return {
      statusCode: 200,
      body: JSON.stringify(recommendation),
    };
  } catch (err) {
    console.log('Error', err);
  }
};
