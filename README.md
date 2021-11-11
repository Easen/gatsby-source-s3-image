<p align="center">
  <a href="https://gatsbyjs.org">
    <img src="./assets/logo.svg" width="100" />
  </a>
</p>
<h1 align="center">
  @marceasen/gatsby-source-s3-image
</h1>

[![npm][gh-action-badge]][gh-action]
[![npm][npm-badge]][npm-link]
[![Maintainability][codeclimate-maintainability-badge]][codeclimate-maintainability]
[![Test Coverage][codeclimate-coverage-badge]][codeclimate-coverage]

## What is this?

This is a fork of Jesse Stuart amazing [gatsby-source-s3-image][[github orig]],
updated for [GatsbyJS][github] v4.

`gatsby-source-s3-image` is a [GatsbyJS][github] _Source_ plugin for
**converting images from any S3-compliant API[1] into GatsbyJS nodes**.

[1] This includes AWS S3, of course, as well as third-party solutions like
Digital Ocean Spaces, or open source / self-hosted products like [MinIO][min].

### But I can just query S3 manually client-side...

Sure, knock yourself out. But there are a few benefits you get out-of-the-box
with this package:

- Native integration with Gatsby's GraphQL data ontology, of course. You just
  provide the bucket details (and IAM credentials, if not public, which is
  recommended).
- Several other benefits come with this tight integration with Gatsby API's,
  such as intelligent caching (nobody wants to wind up with an unexpected S3
  bill as your CI server happily churns out builds, amiright?); automatic image
  asset optimization thanks to `gatsby-image`, etc.
- And to top things off — `gatsby-source-s3-image` will **automatically detect
  and extract image EXIF metadata from your photos**, and expose this data at
  the GraphQL layer as node fields.

### Tell me more about this EXIF stuff.

Currently supported EXIF fields that are automatically extracted when available
include:

- `DateCreatedISO` (`string`)
- `DateTimeOriginal` (`number`)
- `ExposureTime` (`number`)
- `FNumber` (`number`)
- `FocalLength` (`number`)
- `ISO` (`number`)
- `LensModel` (`string`)
- `Model` (`string`)
- `ShutterSpeedValue` (`number`)

These fields are properties of the "wrapper" node, `S3ImageAsset`. This type
composes the `ImageSharp` node, the `File` node representing the cached image on
disk (fetched via the `RemoteFileNode` API), and lastly the extracted EXIF data.
As a result, you can easily retrieve both a set of images as well as any subset
of their associated metadata in a single request — or just the metadata by
itself, if that's all you need. For example:

```es6
export const pageQuery = graphql`
  query PhotographyPostsQuery {
    allS3ImageAsset {
      edges {
        node {
          id
          EXIF {
            DateCreatedISO
            ExposureTime
            FNumber
            ShutterSpeedValue
          }
          childrenFile {
            childImageSharp {
              original {
                height
                width
              }
              thumbnailSizes: fluid(maxWidth: 256) {
                aspectRatio
                src
                srcSet
                sizes
              }
              largeSizes: fluid(maxWidth: 1024) {
                aspectRatio
                src
                srcSet
                sizes
              }
            }
          }
        }
      }
    }
  }
`
```

## Usage

### Setup

Add the dependency to your `package.json`:

```console
$ yarn add @marceasen/gatsby-source-s3-image
$ # Or:
$ npm install --save @marceasen/gatsby-source-s3-image
```

Next, register the plugin with the GatsbyJS runtime in the `plugins` field
exported from your `gatsby-config.js` file, filling in the values to point to
wherever your bucket is hosted:

```es6
const sourceS3 = {
  resolve: 'gatsby-source-s3-image',
  options: {
    bucketName: 'easen.pics',
    domain: null, // [optional] Not necessary to define for AWS S3; defaults to `s3.amazonaws.com`
    protocol: 'https', // [optional] Default to `https`.
  },
}

const plugins = [
  sourceS3,
  // ...
]

module.exports = { plugins }
```

## Querying

As mentioned above, `gatsby-source-s3-image` exposes nodes of type
`S3ImageAsset`:

```typescript
interface S3ImageAssetNode {
  id: string
  absolutePath: string
  LastModified: Date
  ETag: string
  Key: string
  EXIF?: ExifData
  internal: {
    content: string
    contentDigest: string
    mediaType: string
    type: string
  }
}

interface ExifData {
  DateCreated?: Date
  DateCreatedISO?: string
  DateTime?: Date
  DateTimeOriginal?: number
  ExposureTime?: number
  Exposure?: string
  FNumber?: number
  FocalLength?: number
  ISO?: number
  LensModel?: string
  Model?: string
  ShutterSpeedFraction?: string
  ShutterSpeedValue?: string
  UserComment?: string
}
```

Not only can this be used to populate page data, I've found it useful in
bootstrapping the pages themselves, e.g., to programmatically create dynamic
Photo Gallery pages at build time depending on the contents of a bucket. For
example:

```typescript
// In `gatsby-node.js` -- using a query like this:
const photographyQuery = graphql`
  {
    allS3ImageAsset {
      edges {
        node {
          ETag
          EXIF {
            DateCreatedISO
          }
        }
      }
    }
  }
`

// We can then dynamically generate pages based on EXIF data, like this:
const createPages = ({ actions }) => {
  const { createPage } = actions
  const photographyTemplate = path.resolve(
    './src/templates/photography-post.js'
  )

  const createPhotographyPosts = edges => {
    // Create the photography "album" pages -- these are a collection of photos
    // grouped by ISO date.
    const imagesGroupedByDate = _.groupBy(edges, 'node.EXIF.DateCreatedISO')
    _.each(imagesGroupedByDate, (images, date) => {
      createPage({
        path: `/photography/${date}`,
        component: photographyTemplate,
        context: {
          name: date,
          datetime: DateTime.fromISO(date),
          type: PageType.Photography,
        },
      })
    })
  }
}
```

[codeclimate-maintainability-badge]: https://api.codeclimate.com/v1/badges/80a88a48f7c1d32adbed/maintainability
[codeclimate-maintainability]: https://codeclimate.com/github/Easen/gatsby-source-s3-image/maintainability
[codeclimate-coverage-badge]: https://api.codeclimate.com/v1/badges/80a88a48f7c1d32adbed/test_coverage
[codeclimate-coverage]: https://codeclimate.com/github/Easen/gatsby-source-s3-image/test_coverage
[github]: https://github.com/gatsbyjs/gatsby
[github orig]: https://github.com/jessestuart/gatsby-source-s3-image/pull/418
[min]: https://min.io
[npm-badge]: https://img.shields.io/npm/v/@marceasen/gatsby-source-s3-image.svg
[npm-link]: https://www.npmjs.com/package/@marceasen/gatsby-source-s3-image
[gh-action-badge]: https://github.com/easen/gatsby-source-s3-image/actions/workflows/test/badge.svg
[gh-action]: https://github.com/easen/gatsby-source-s3-image/actions/workflows/test/
