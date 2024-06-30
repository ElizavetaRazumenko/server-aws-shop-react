import { APIGatewayProxyEvent } from 'aws-lambda';
import { getHeaders } from './helpers';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const handler = async (event: APIGatewayProxyEvent) => {
  console.log('importProductsFile handler on work, the event', JSON.stringify(event, null, 2));

  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    return {
      statusCode: 400,
      headers: {
        ...getHeaders(),
      },
      body: JSON.stringify({
        message: "File name is required"
      })
    }
  }

  const bucket = process.env.bucket_name!;

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: `uploaded/${fileName}`,
  });

  const clientS3 = new S3Client({ region: 'eu-central-1' });

  try {
    const signedURL = await getSignedUrl(clientS3, putObjectCommand, { expiresIn: 3600 });

    console.log('SignedUrl created:', signedURL);

    return {
      statusCode: 200,
      headers: {
        ...getHeaders(),
        'Access-Control-Allow-Methods': 'GET, POST',
      },
      body: JSON.stringify({
        url: signedURL
      })
    }
  } catch (error) {
    console.log('Signed URL creation failed', JSON.stringify(error, null, 2));

    return {
      statusCode: 500,
      headers: {
        ...getHeaders(),
      },
      body: JSON.stringify({
        message: 'Signed URL creation failed', error
      })
    }
  }
}