import * as csv from "csv-parser";
import * as stream from "stream";
import { S3Event } from 'aws-lambda';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";


const client = new S3Client();

export const handler = async (event: S3Event) => {
  console.log('importFileParser handler, the event', event);

  const bucket = event.Records[0].s3.bucket.name;
  const fileName = event.Records[0].s3.object.key;

  console.log(`Bucket: ${bucket}, FileName: ${fileName}`);

  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });

    const key = fileName.replace("uploaded/", "parsed/");
    console.log(`Parsed Key: ${key}`);

    console.log('Sending GetObjectCommand');
    const response = await client.send(getCommand);
    console.log('GetObjectCommand Response:', response);

    const parsedData: Record<string, string>[] = [];

    if (response.Body instanceof stream.Readable) {
      console.log('Processing stream');
      response.Body.pipe(csv())
        .on("data", (data: Record<string, string>) => parsedData.push(data))
        .on("end", () => {
          console.log("The parsed CSV:", parsedData);
        });
    } else {
      throw new Error("Not a readable stream");
    }


    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${fileName}`,
      Key: key,
    });

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });
 

    try {
      console.log('Sending CopyObjectCommand');
      await client.send(copyCommand);
      console.log('CopyObjectCommand successful');

      console.log('Sending DeleteObjectCommand');
      await client.send(deleteCommand);
      console.log('DeleteObjectCommand successful');

      console.log('The parsing and transfer operation was successful');
    } catch (error) {
      console.error("Error in Copy/Delete operations", error);
    }

    console.log(
      'The parsing and transfer operation was successful'
    );
  } catch (error) {
    console.error("Something went wrong", error);
  }
}