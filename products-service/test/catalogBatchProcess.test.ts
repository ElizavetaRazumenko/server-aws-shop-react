import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SNSClient,  } from "@aws-sdk/client-sns";
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { handler } from '../lambda/catalogBatchProcess';
import { randomUUID } from 'crypto';

jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

const SNSClientMock = SNSClient as jest.MockedClass<typeof SNSClient>;
const DynamoDBDocumentMock = DynamoDBDocument as jest.Mocked<typeof DynamoDBDocument>;
const sendMock = jest.fn();

const mockEnv = {
  PRODUCTS: 'products_table',
  STOCK: 'stocks_table',
  SNS_TOPIC_ARN: 'arn:aws:sns:region:account-id:topic-name',
};

describe('catalogBatchProcess handler', () => {
  beforeEach(() => {
    process.env = { ...mockEnv };
    SNSClientMock.prototype.send = sendMock;
    DynamoDBDocumentMock.from = jest.fn().mockReturnValue({
      send: sendMock,
    });
    sendMock.mockReset();
    (randomUUID as jest.Mock).mockReturnValue('unique-id');
  });

  it('should return 400 if any required parameter is missing', async () => {
    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ title: 'Product Title' }),
        } as SQSRecord,
      ],
    };

    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Some of the required parameters is missing');
  });

  it('should return 201 if products are created successfully', async () => {
    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            title: 'Product Title',
            description: 'Product Description',
            price: 100,
            count: 10,
          }),
        } as SQSRecord,
      ],
    };

    sendMock.mockResolvedValue({});

    const response = await handler(event);
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).message).toBe('Products created');
  });

  it('should return 500 if there is an error', async () => {
    const event: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({
            title: 'Product Title',
            description: 'Product Description',
            price: 100,
            count: 10,
          }),
        } as SQSRecord,
      ],
    };

    sendMock.mockRejectedValue(new Error('DynamoDB Error'));

    const response = await handler(event);
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toContain('Something went wrong');
  });
});
