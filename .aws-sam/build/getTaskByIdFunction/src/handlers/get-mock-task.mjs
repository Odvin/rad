import task from '../mock/Task.mjs';

// Generate mock for the task
export const handler = async () => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify(task.create()),
    };
  } catch (err) {
    console.log('Error', err);
  }
};
