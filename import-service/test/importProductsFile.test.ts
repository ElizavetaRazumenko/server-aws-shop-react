const mockFileName = "test-file.csv";
const mockSignedUrl = 'test-file.csv/test-bucket';

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handler } from "../lambda/importProductsFile";
import { APIGatewayProxyEvent } from "aws-lambda";

jest.mock("@aws-sdk/s3-request-presigner", () => {
  return {
    getSignedUrl: jest.fn().mockReturnValue(mockSignedUrl),
  };
});
jest.mock("@aws-sdk/client-s3");

describe("importProductsFile handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a signed url", async () => {
    const event = {
      queryStringParameters: { name: mockFileName },
    } as unknown as APIGatewayProxyEvent;

    const res = await handler(event);
    const message = JSON.parse(res.body);
    expect(message).toEqual({ url: mockSignedUrl });
    expect(res.statusCode).toBe(200);
  });

  it("should return a 400 Error if name is not provided", async () => {
    const event = {} as unknown as APIGatewayProxyEvent;

    const res = await handler(event);
    const message = JSON.parse(res.body);
    expect(message).toEqual({ message: "File name is required" });
    expect(res.statusCode).toBe(400);
  });
});