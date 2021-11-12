import { FileSystemNode } from 'gatsby-source-filesystem'
import * as Factory from 'factory.ts'

import { constructS3UrlForAsset, getEntityNodeFields, isImage } from '../utils'
import { S3 } from 'aws-sdk'

const FileSystemNodeMock = Factory.Sync.makeFactory<FileSystemNode>({})

const GetSignedUrlMock = jest.fn()
jest.mock('aws-sdk', () => ({
  S3: class {
    public getSignedUrl = GetSignedUrlMock
  },
}))

describe('utils', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })
  afterAll(() => jest.restoreAllMocks())

  test('isImage', () => {
    const imageEntity = { Key: 'foo.jpg' }
    expect(isImage(imageEntity)).toBeTruthy()

    const notImageEntity = { Key: 'foo.bar' }
    expect(isImage(notImageEntity)).toBeFalsy()
  })

  test('constructS3UrlForAsset: AWS', () => {
    GetSignedUrlMock.mockImplementation(
      (_cmd: string, options: Record<string, unknown>) =>
        `https://example.com/${options.Bucket}/${options.Key}?expires=${options.Expires}`
    )
    const s3Url: string = constructS3UrlForAsset({
      bucketName: 'jesse.pics',
      domain: 's3.amazonaws.com',
      key: 'my_image.jpg',
      s3: new S3({}),
    })
    expect(s3Url).toBe(
      'https://example.com/jesse.pics/my_image.jpg?expires=300'
    )
    expect(GetSignedUrlMock).toBeCalledTimes(1)
  })

  test('constructS3UrlForAsset: third-party implementation', () => {
    const customUrl = constructS3UrlForAsset({
      bucketName: 'js-bucket',
      domain: 'minio.jesses.io',
      key: 'my_image.jpg',
      protocol: 'https',
    })
    expect(customUrl).toBe('https://minio.jesses.io/js-bucket/my_image.jpg')
  })

  test('constructS3UrlForAsset: invalid input', () => {
    expect(() => {
      // Invalid params -- `key` is required.
      // eslint-disable-next-line
      // @ts-ignore
      constructS3UrlForAsset({
        bucketName: 'js-bucket',
        domain: 'minio.jesses.io',
        protocol: 'http',
      })
    }).toThrow()
  })

  test('Verify getEntityNodeFields utils func.', () => {
    const ETag = '"833816655f9709cb1b2b8ac9505a3c65"'
    const Key = '2019-04-10/DSC02943.jpg'
    const fileNodeId = 'file-node-id'
    const absolutePath = `/path/to/file/${Key}`
    const entity = { ETag, Key }
    const nodeFields = getEntityNodeFields({
      entity,
      fileNode: FileSystemNodeMock.build({ absolutePath, id: fileNodeId }),
    })

    expect(nodeFields).toEqual({
      absolutePath,
      fileNodeId,
      Key,
      mediaType: 'image/jpeg',
      objectHash: '833816655f9709cb1b2b8ac9505a3c65',
    })
  })
})
