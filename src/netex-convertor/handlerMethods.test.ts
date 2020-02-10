/* eslint-disable @typescript-eslint/no-explicit-any */

import AWS from 'aws-sdk';
import { fetchDataFromS3AsJSON, setS3ObjectParams, s3ObjectParameters } from './handler';
import {
    getItemFromDynamoDBTableWithPartitionKey,
    getItemFromDynamoDBTableWithPartitionKeyAndSortKey,
    getAttributeValueFromDynamoDBItemAsAString,
    getAttributeValueFromDynamoDBItemAsStringArray,
    getAttributeValueFromDynamoDBItemAsObjectArray,
} from './dynamoDBService';
import * as mocks from './test-data/test-data';

jest.mock('aws-sdk');

describe('fetchDataFromS3AsJSON', () => {
    const mockS3GetObject = jest.fn();
    const s3Params: s3ObjectParameters = {
        Bucket: 'thisIsMyBucket',
        Key: 'andThisIsTheNameOfTheThing',
    };

    beforeEach(() => {
        mockS3GetObject.mockReset();
        (AWS.S3 as any) = jest.fn().mockImplementation(() => {
            return {
                getObject: mockS3GetObject,
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns the JSON data', async () => {
        mockS3GetObject.mockImplementation(() => ({
            promise(): Promise<{}> {
                return Promise.resolve({ Body: mocks.mockS3ObjectDataAsString });
            },
        }));
        const fetchedData = await fetchDataFromS3AsJSON(s3Params);
        expect(fetchedData).toStrictEqual(mocks.mockS3ObjectDataAsJson);
    });

    it('throws an error when no data comes back from S3', async () => {
        mockS3GetObject.mockImplementation(() => ({
            promise(): Promise<{}> {
                return Promise.reject(new Error());
            },
        }));
        expect.assertions(1);
        await expect(fetchDataFromS3AsJSON(s3Params)).rejects.toThrow('Error in retrieving data.');
    });

    it('calls get object from S3 using params provided', async () => {
        mockS3GetObject.mockImplementation(() => ({
            promise(): Promise<{}> {
                return Promise.resolve({ Body: mocks.mockS3ObjectDataAsString });
            },
        }));
        await fetchDataFromS3AsJSON(s3Params);
        expect(mockS3GetObject).toHaveBeenCalledWith(s3Params);
    });
});

describe('setS3ObjectParams', () => {
    const bucketName = 'fdbt-test-matchingdata-s3-bucket';
    const fileName = 'fdbt-test-matchingdata.json';
    const s3Event = mocks.mockS3Event(bucketName, fileName);

    it('sets s3BucketName from S3Event', () => {
        const params = setS3ObjectParams(s3Event);
        expect(params.Bucket).toEqual(bucketName);
    });

    it('sets S3FileName from S3Event', () => {
        const params = setS3ObjectParams(s3Event);
        expect(params.Key).toEqual(fileName);
    });

    it('removes spaces and unicode non-ASCII characters in the S3FileName', () => {
        const file = 'fdbt%2Ftest+%3A+matchingdata.json';
        const S3Event = mocks.mockS3Event(bucketName, file);
        const expectedParams = {
            Bucket: bucketName,
            Key: 'fdbt/test : matchingdata.json',
        };
        const params = setS3ObjectParams(S3Event);
        expect(params).toEqual(expectedParams);
    });
});

describe('get item data from DynamoDB table with partition key', () => {
    const tableName = 'mockTableName';
    const partitionKey = 'mockPartitionKey';
    const partitionKeyValue = 'mockPartitionKeyValue';
    const mockDynamoQuery = jest.fn();

    beforeEach(() => {
        mockDynamoQuery.mockReset();
        (AWS.DynamoDB.DocumentClient as any) = jest.fn(() => {
            return { query: mockDynamoQuery };
        });

        mockDynamoQuery.mockImplementation(() => ({
            promise(): Promise<{}> {
                return Promise.resolve(mocks.mockDynamoDBItemDataObjectWithAttributeValueAsString);
            },
        }));
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('gets data for an item from DynamoDB using partition key', async () => {
        const fetchedData = await getItemFromDynamoDBTableWithPartitionKey(tableName, partitionKey, partitionKeyValue);

        expect(fetchedData).toBe(mocks.mockDynamoDBItemDataObjectWithAttributeValueAsString);
    });
});

describe('get item data from DynamoDB table with partition key and sort key', () => {
    const tableName = 'mockTableName';
    const partitionKey = 'mockPartitionKey';
    const partitionKeyValue = 'mockPartitionKeyValue';
    const sortKey = 'mockSortKey';
    const sortKeyValue = 'mockSortKeyValue';
    const mockDynamoQuery = jest.fn();

    beforeEach(() => {
        mockDynamoQuery.mockReset();
        (AWS.DynamoDB.DocumentClient as any) = jest.fn(() => {
            return { query: mockDynamoQuery };
        });

        mockDynamoQuery.mockImplementation(() => ({
            promise(): Promise<{}> {
                return Promise.resolve(mocks.mockDynamoDBItemDataObjectWithAttributeValueAsString);
            },
        }));
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('gets data for an item from DynamoDB using partition key', async () => {
        const fetchedData = await getItemFromDynamoDBTableWithPartitionKeyAndSortKey(
            tableName,
            partitionKey,
            partitionKeyValue,
            sortKey,
            sortKeyValue,
        );

        expect(fetchedData).toBe(mocks.mockDynamoDBItemDataObjectWithAttributeValueAsString);
    });
});

describe('get attribute value from DynamoDB item as a string', () => {
    it('gets attribute value as a string', () => {
        const result = getAttributeValueFromDynamoDBItemAsAString(
            mocks.mockDynamoDBItemDataObjectWithAttributeValueAsString,
            'testattribute',
        );

        expect(result).toBe('test');
    });
});

describe('get attribute value from DynamoDB item as a string array', () => {
    it('gets attribute value as string array', () => {
        const result = getAttributeValueFromDynamoDBItemAsStringArray(
            mocks.mockDynamoDBItemDataObjectWithAttributeValueAsStringArray,
            'testattribute',
        );

        expect(result).toStrictEqual(['test1', 'test2']);
    });
});

describe('get attribute value from DynamoDB item as object array', () => {
    it('gets attribute value as object array', () => {
        const result = getAttributeValueFromDynamoDBItemAsObjectArray(
            mocks.mockDynamoDBItemDataObjectWithAttributeValueAsObjectArray,
            'testattribute',
        );

        expect(result).toStrictEqual([{ test1: 'aaaa', test2: 'bbbb' }]);
    });
});