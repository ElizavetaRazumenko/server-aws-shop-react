import { APIGatewayProxyEvent } from 'aws-lambda';
import { getHeaders } from './helpers';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.BUCKET ?? "";

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
  const clientS3 = new S3Client({ region: 'eu-central-1' });

  try {
    const signedURL = await getSignedUrl(clientS3, new PutObjectCommand({
      Bucket: BUCKET,
      Key: `uploaded/${fileName}`,
    }),
    { expiresIn: 3600 }
  );

    console.log('SignedUrl created:', signedURL);

    return {
      statusCode: 200,
      headers: {
        ...getHeaders(),
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
        message: 'Operation  failed', error
      })
    }
  }
}