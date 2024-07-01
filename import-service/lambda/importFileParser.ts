import * as csv from "csv-parser";
import * as stream from "stream";
import { S3Event } from 'aws-lambda';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const handler = async (event: S3Event) => {
  console.log('importFileParser handler on work, the event', JSON.stringify(event, null, 2));

  try {
    const client = new S3Client();

    const bucket = event.Records[0].s3.bucket.name;
    const fileName = event.Records[0].s3.object.key;

    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });

    const response = await client.send(getCommand);

    const parsed: Record<string, string>[] = [];

    if (response.Body instanceof stream.Readable) {
      response.Body.pipe(csv())
        .on("data", (data: Record<string, string>) => parsed.push(data))
        .on("end", () => {
          console.log("The parsed CSV:", parsed);
        });
    } else {
      throw new Error("Not a readable stream");
    }

    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${fileName}`,
      Key: fileName.replace("uploaded/", "parsed/"),
    });

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });

    await client.send(copyCommand);
    await client.send(deleteCommand);

    console.log(
      'The parsing and transfer operation was successful'
    );
  } catch (error) {
    console.error("Something went wrong", error);
  }
}