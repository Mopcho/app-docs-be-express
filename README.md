# Docs-App

Docs App is file storage API that uses UserBase, AWS S3 Buckets, AWS CloudFront and Auth0 to manage users, store documents and even videos.

## Navigation
* [User Base Documentation](https://github.com/ihadventureandcreative/be-base)
* [Installation](#Installation)
* [Auth0 Setup](#Auth0-Setup)
* [AWS S3 Bucket Setup](#AWS-S3-Bucket-Setup)
* [Starting the API](#Starting-the-API)
* [App Docs Routes](#Routes)
* [User Base Routes](https://github.com/ihadventureandcreative/be-base#routes)
* [Deployment](#Deployment)

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install dependancies.

```bash
npm i
```

This API requires additional setup. In order for it to work you need to setup :

-   [Auth0](https://auth0.com/)

-   [AWS S3 Bucket](https://aws.amazon.com/).

# Auth0 Setup

We use Auth0 for User Authentication and User Authorization. In order to get it up and running you will have to create an account from [this link](https://auth0.com/).

1. Create an Auth0 account.

2. Click on Applications > APIs

3. Create API
    - Choose a name and identifier and leave signing algorithm as it is.
    - **_Save identifier and signing algorith to your .env_**
4. Now go to your newly created API's settings and enable RBAC \* This will enable authorization and it will
   place user permissions in the token.
5. Now go to Applications and click on the auto generated application for your API
    - **_Save clientId, clientSecret and domain to your .env_**
    - Go to APIs now and authorize Auth0 Managment API and make sure you API is authorized as well
6. Now we have to create a Database connection in which Auth0 will store users
    - Go to Authentication > Databases > Create Database Connection
    - After creating it, click on it and go to Applications. Here you have to specify which applications are going to store users here. Select your newly created application.
    - **_Save the name of the database connection to your .env file_**
7. Now in order for us to have custom permission like read:products, write:products etc... we need to create them
    - Go to Applications > APIs > Permissions
    - There you can create custom permissions for your API
8. Now if we want to have roles with cerain permissions we will have to create them and apply them
    - Go to User Managment > Roles > Create Role
    - Enter a name (User/Admin/Editor etc...) and description for yor role
    - After creating it click on it and go to permissions
    - Click Add Permissions and select your API
    - There you will see all of your API's permissions. Select which ones you want to grant this role.
9. Now in order for us to be able to access user roles we have to make a post-login "Action".
    - Go to Actions > Library > Build Custom and choose a name like 'Add roles to user'
    - Paste this code in the action :

```javascript
    /**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {

  const namespace = 'roles';

  // We check if it's the user's first login - if
// yes, we add the role to the user and return the newly
// created role in the idToken and the accessToken as well.
  if (event.stats.logins_count === 1) {
    const ManagementClient = require('auth0').ManagementClient;

    const management = new ManagementClient({
        domain: event.secrets.domain,
        clientId: event.secrets.clientId,
        clientSecret: event.secrets.clientSecret,
    });

    const params =  { id : event.user.user_id};
    const data = { "roles" : ["rol_dxUQ3qB1nNRCnk0C"]};

    try {
      const res = await management.assignRolestoUser(params, data)
      if (event.authorization) {
        api.idToken.setCustomClaim(`${namespace}/roles`, ["User"]);
        api.accessToken.setCustomClaim(`${namespace}/roles`, ["User"]);
      }
    } catch (e) {
      console.log(e)
      // Handle error
    }
  } else {
    // We just fetch the role and surcharge the idToken and accessToken with it.
    if (event.authorization) {
      api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
      api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    }
  }  
};


/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };
```
- You also need to add event secrets : In the code editor on the left side you will see a key. Press it and add the following keys : domain , clientId , clientSecret (Names must be exactly as those in order for it to work).
- Click Deploy
- Go to Actions > Flows > Login > On the right sidebar press custom, find your newly created action and drag and drop it in the window. (Dont forget to click 'Apply')

10. Now we also want to add user's permissions on login so go ahead and make another custom Action and call it something like "attach-permissions"

- This is the code you need to paste :

```javascript
/**
* Handler that will be called during the execution of a PostLogin flow.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => 
{

  var map = require('array-map');
  var ManagementClient = require('auth0').ManagementClient;
  var management = new ManagementClient
  (
    {
      domain: event.secrets.domain,
      clientId: event.secrets.clientId,
      clientSecret: event.secrets.clientSecret
    }
  );

  var params = { id: event.user.user_id, page: 0, per_page: 50, include_totals: false };

  let userPermissions = await management.getUserPermissions(params);

  var permissionsArray = map(userPermissions, function (permission) 
    {
      return permission.permission_name;
    }
  );

  api.accessToken.setCustomClaim("access", permissionsArray);
};


/**
* Handler that will be invoked when this action is resuming after an external redirect. If your
* onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
// exports.onContinuePostLogin = async (event, api) => {
// };

```

-   Now again go to Actions > Flow > On the right sidebar click custom > Drag and drop your action and press Apply.

( !!! IMPORTANT : This action needs to be placed after the first action that we created in order for it to work !!!).

- ***Now you can access user roles via 'roles/roles' and user's permissions via 'access'***

11. Now you have to make a grant that will allow your app to log in users with username and password.
    -   Go to Applications > Select your App > Settings > Scroll down to advanced seetings
    -   Click on Grant Type and select password

**_Thats It you now have authentication and Authorization setup for this API_**

## AWS S3 Bucket Setup

We are going to use AWS S3 Bucket for cloud storage for user files. In order to get it up and running you will have to create an account from [this link](https://aws.amazon.com/).
After creating the account follow the steps below :

### Creating the documents bucket :

1. First we need to create the bucket that will be used to store our documents.
    - In the search bar type "S3" and press on S3
    - From there press create a bucket
    - For the settings choose a name for your bucket, a region (in most cases it doesnt matter but prefarably choose something close to you), block all public access ( Strongly Reccomended )
    - **_After creating it save your region and bucket name into the .env for example_** :
    - **_AWS_BUCKET_NAME = "app-docs-documentsBucket"_**
    - **_AWS_BUCKET_REGION = "eu-west-3"_**
2. You now have to create a policy for the bucket. Policy can be placed on users or machines ( in our case ) and it will tell them what they can and what they can't do.
    - Type in the search bar "IAM" and click on it
    - Click on create policy
    - For services choose S3, for actions choose [Read : Get Object , Write : Put object, Delete object]
    - For resource you need to create an ARN : Enter the name of the bucket you just created and for objects press the check box "any"
    - Next -> Skip Tags
    - Add name for your policy (and optional description )
    - Click on create policy
3. Now we have to create a user which will represent our API
    - In the sidebar of the IAM section click on Users
    - Choose a name and click on Programatic Access ( This will give us a key and a secret )
    - Next
    - Attach Existing Policies -> Search for the name of the policy you just created and add it
    - Next -> Next -> Create User
    - **_Now you need to save Acccess key Id, Secret access key to your .env_**

### Creating the video bucket :

1. First we need to create the bucket that will be used to store our documents.
    - In the search bar type "S3" and press on S3
    - From there press create a bucket
    - For the settings choose a name for your bucket, a region (in most cases it doesnt matter but prefarably choose something close to you), block all public access ( Strongly Reccomended )
    - **_After creating it save your region and bucket name into the .env for example_** :
    - **_AWS_MEDIABUCKET_NAME = "app-docs-mediaBucket"_**
    - **_AWS_MEDIABUCKET_REGION = "eu-west-3"_**
2. You now have to create a policy for the bucket. Policy can be placed on users or machines ( in our case ) and it will tell them what they can and what they can't do.
    - Type in the search bar "IAM" and click on it
    - Click on create policy
    - For services choose S3, for actions choose [Read : Get Object , Write : Put object, Delete object]
    - For resource you need to create an ARN : Enter the name of the bucket you just created and for objects press the check box "any"
    - Next -> Skip Tags
    - Add name for your policy (and optional description )
    - Click on create policy
3. You need to place this policy now on the same user ( machine ) that we created before.
    - In the sidebar of the IAM section click on Users
    - Permissions > Add permissions > Attach existing policy
    - Attach Existing Policies -> Search for the name of the policy you just created and add it

***Now you have :***
- 1 user(your API)
- 2 buckets
- 2 policies (placed on 1 user, one for the document's bucket, and 1 for the media bucket) 

In order for you to access videos safely you will have to setup CloudFront too.
Whatever you upload will be distibuted around the world and users accessing from different points of the globe will have minimal latency this way.

### Setting Up CloudFront :

***If you prefer there is a very good documentation on setting up CloudFront in details, here is the link : [Setting up CloudFront](https://docs.aws.amazon.com/AmazonS3/latest/userguide/tutorial-s3-cloudfront-route53-video-streaming.html#cf-s3-step1)***

- If you are going to use the AWS CloudFront tutorial you can skip directly to Step 3 in their tutorial

1. Create a CloudFront origin access identity.

   * To restrict direct access to the video from your S3 bucket, create a special CloudFront user called an origin access identity (OAI). You will associate the OAI with your distribution later in this tutorial. By using an OAI, you make sure that viewers can't bypass CloudFront and get the video directly from the S3 bucket.
   - Оpen the CloudFront console using the search bar

   - In the left navigation pane, under the Security section, choose Origin access identities.

   - Choose Create origin access identity.

   - Enter a name (for example, ***S3-OAI***) for the new origin access identity.

   - Choose Create.

2. Create a CloudFront distribution

   * To use CloudFront to serve and distribute the video in your S3 bucket, you must create a CloudFront distribution.

   - Sign in to the AWS Management Console and open the CloudFront console

   - In the left navigation pane, choose ***Distributions***.

   - Choose ***Create distribution***.

   - In the ***Origin*** section, for ***Origin domain***, choose the domain name of your S3 origin, which starts with the name of the S3 bucket that you created in Step 1 (for example, ***app-docs-mediaBucket***).

   - For ***S3 bucket access***, choose ***Yes use OAI (bucket can restrict access to only CloudFront)***.

   - Under ***Origin access identity***, choose the origin access identity that you created in Step 1 (for example, ***S3-OAI***).

   - Under ***Bucket policy***, choose ***Yes, update the bucket policy***.

   - In the ***Default cache behavior*** section, under ***Viewer protocol policy***, choose ***Redirect HTTP to HTTPS***.

   - When you choose this feature, HTTP requests are automatically redirected to HTTPS to secure your website and protect your viewers' data.

   - For the other settings in the ***Default cache behaviors*** section, keep the default values.

   - (Optional) You can control how long your file stays in a CloudFront cache before CloudFront forwards another request to your origin. Reducing the duration allows you to serve dynamic content. Increasing the duration means that your viewers get better performance because your files are more likely to be served directly from the edge cache. A longer duration also reduces the load on your origin. For more information, see Managing how long content stays in the cache (expiration) in the Amazon CloudFront Developer Guide.

   - For the other sections, keep the remaining settings set to the defaults.

   - For more information about the different settings options, see [Values That You Specify When You Create or Update a Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html) in the Amazon CloudFront Developer Guide.

   - At the bottom of the page, choose ***Create distribution***.

   - On the ***General*** tab for your CloudFront distribution, under ***Details***, the value of the ***Last modified*** column for your distribution changes from ***Deploying*** to the timestamp when the distribution was last modified. This process typically takes a few minutes.

3. Access the video through the CloudFront distribution.

   Now, CloudFront can serve the video stored in your S3 bucket. To access your video through CloudFront, you must combine your CloudFront distribution domain name with the path to the video in the S3 bucket.

   - Sign in to the AWS Management Console and open the CloudFront console.

   - In the left navigation pane, choose Distributions.

   - To get the distribution domain name, do the following:

   - In the Origins column, find the correct CloudFront distribution by looking for its origin name, which starts with the S3 bucket that you created (for example, app-docs-mediaBucket).

   - After finding the distribution in the list, widen the Domain name column to copy the domain name value for your CloudFront distribution.

   - In a new browser tab, paste the distribution domain name that you copied.

   - Return to the previous browser tab, and open the S3 console.

   - In the left navigation pane, choose Buckets.

   - In the Buckets list, choose the name of the bucket that you created in Step (for example, app-docs-mediaBucket).

   - Upload a video to the bucket now and when you do click on it's name.

   - On the object detail page, in the Object overview section, copy the value of the Key. This value is the path to the uploaded video object in the S3 bucket.

   - Return to the browser tab where you previously pasted the distribution domain name, enter a forward slash (/) after the distribution domain name, and then paste the path to the video that you copied earlier (for example, sample.mp4).

   - Now, your S3 video is publicly accessible and hosted through CloudFront at a URL that looks similar to the following:

   - https://[CloudFront distribution domain name]/[Path to the S3 video]

## Starting the API

Now after setting up everything you can start the API.

Use this to build the application with TypeScript :

```cmd
npm run build
```

Use this to make a prisma migration :

```cmd
npx prisma migrate dev --name InitialImage
```

Use this to patch the database (Currently its only adding cascading deletes) :

```cmd
npm run patchDB
```

Run this if you want to seed both Auth0 and your Database with 3 custom users :

```cmd
npm run seed
```

* If this throws an error try running it again, if this doesnt help that probably means that you probably already have users in Auth0 with the same credentials (either delete them from the Auth0 managment console or go to seed.ts and change the dummy users credentials). And dont forget to run ***npm run build*** so the changes from the seeder can be applied

And use this to start the application with Nodemon :

```cmd
npm run start
```

# Routes

The access level of the routes are User and Admin.

## Users routes :

### Documents Route :

1. `GET /documents` - Shows only this user's documents

2. `GET /documents/:id` - Can get only his documents

3. `POST /documents`

4. `PUT /documents/:id` - Can update only his documents

5. `DELETE /documents/:id` - Can delete only his documents

### Media Route :

1. `GET /media` - Shows only this user's media

2. `GET /media/:id` - Can get only his media

3. `POST /media`

4. `PUT /media/:id` - Can update only his media

5. `DELETE /media/:id` - Can delete only his media

## Admin Routes : 

* Can access every route and can see everyone's files

# Documents Resource

## 1. `GET /documents`

#### Request Response

```json
{
    "data": [
        {
            "id": "72a8a6cc-80a3-453e-8828-ab936f1183c8",
            "name": "hi",
            "extName": "jpg",
            "key": "testtxt_5689120151",
            "contentType": "image/jpeg",
            "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
            "updatedAt": "2022-08-04T13:07:28.998Z",
            "createdAt": "2022-08-04T13:06:17.818Z"
        }
    ],
    "total": 1
}
```

### Possible Queries :

#### Pagination

-   `?skip=&take=`

**_Skip_** defines the **_page_** while **_take_** defines **_pageSize_**

#### Sorting

-   `orderBy=`

orderBy can sort by 3 different types : **_Number,String and Dates_**

#### Example with String

-   `orderBy=asc:name `

This query will sort documents by name in ascending order

#### Example with Number

-   `orderBy=asc:numberProp`

This query will sort documents by numberProp in ascending order

#### Example with Dates

-   `orderBy=desc:createdAt`

This query will sort Users in descending by the time they were created

#### Filtering

-   `fieldName=`

Filtering can be split into three categories : **_String, Number, Dates_**

#### Example with String

-   `name=cs:ballImage`

This query will return all documents with the name "ballImage" in case sensitive. If you want to filter without case sensitivity remove the `cs:`

#### Example with Numbers

-   `numberProp=gt:19&numberProp=lt:50`

This query will return all documents with numberProp greater than 19 and lesser than 50. (You can also use `lte:` lesser or equal to and `gte:` greater or equal to)

#### Example with Dates

-   `createdAt=gt:2022-07-15T14:07:13.377Z&createdAt=lt:2022-09-15T14:07:13.377Z`

This query will return all documents who were created between 07 and 09

#### Selecting

-   `select=`

This query allows you to select cerain fields to be shown (When selecting a field all other fields wont be shown. If you want to get more than one field you can use 2 selects or 3 selects etc...

#### Example

-   `select=key&select=id`

**_Bear in mind that you can combine those as much as you like._**

## 2. `GET /documents/:key`

This query allows you to get a document by its key (key is stored in the AWS S3 Bucket).

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Response

```json
{
    "databaseResponse": {
        "id": "72a8a6cc-80a3-453e-8828-ab936f1183c8",
        "name": "hi",
        "extName": "jpg",
        "key": "testtxt_5689120151",
        "contentType": "image/jpeg",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:07:28.998Z",
        "createdAt": "2022-08-04T13:06:17.818Z"
    },
    "presignedUrl": "https://be-base.s3.eu-west-3.amazonaws.com/testtxt_5689120151?X-Amz-Algorithm=AWS4-HMAC-SH
A256&X-Amz-Credential=AKIAYT27POQIXSWAXA55%2F20220804%2Feu-west-3%2Fs3%2Faws4_re
quest&X-Amz-Date=20220804T131152Z&X-Amz-Expires=60&X-Amz-Signature=1e439279346314cbfa5f5
8396c8861fd1995131ecff4bb6965bbc25ce416fe04&X-Amz-SignedHeaders=host"
}
```

## 3. `POST /documents`

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Body

```json
{
    "extName" : "txt",
    "fileName" : "testingFile"
}
```
#### Request Response

```json
{
     "databaseResponse": {
        "id": "f212aa7f-9026-4727-a7a4-2dc53d6feeca",
        "name": "testingFile",
        "extName": "txt",
        "key": "testingFile_7199375627",
        "contentType": "text/plain",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T12:58:56.343Z",
        "createdAt": "2022-08-04T12:58:56.343Z"
    },
    "preSignedUrl": "https://be-base.s3.eu-west-3.amazonaws.com/testtxt_807
7791789?Content-Type=text%2Fplain&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-
Credential=AKIAYT27POQIXSWAXA55%2F20220804%2Feu-west-3%2Fs3%2Faws4_
request&X-Amz-Date=20220804T125538Z&X-Amz-Expires=60&X-Amz-Signature=0619f26
a95b76d2e18dc54a392135d7a63b0a8cc6d7af92189d0ed47fa57fb9e&X-Amz-SignedHeaders=host"
}
```

## 4. `DELETE /documents/:key`

* Delete a document both from AWS S3 Bucket and our Database by key.

#### Request Headers

-   `Authorization : Bearer {token}`

```
#### Request Response

```json
{
    "databaseResponse": {
        "id": "b2aed0c9-2c83-4078-b21c-50188c3aab94",
        "name": "testtxt",
        "extName": "txt",
        "key": "testtxt_7828825055",
        "contentType": "text/plain",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:01:34.138Z",
        "createdAt": "2022-08-04T13:01:34.138Z"
    },
    "awsResponse": {}
}
```

## 5. `PUT /documents`

* This can not change the key in AWS as it can not be changed. It will only change the name in our db !

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Body

```json
{
    "extName" : "jpg",
    "fileName" : "hi"
}
```
#### Request Response

```json
{
     {
    "databaseResponse": {
        "id": "72a8a6cc-80a3-453e-8828-ab936f1183c8",
        "name": "hi",
        "extName": "jpg",
        "key": "testtxt_5689120151",
        "contentType": "image/jpeg",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:07:28.998Z",
        "createdAt": "2022-08-04T13:06:17.818Z"
    },
    "preSignedUrl": "https://be-base.s3.eu-west-3.amazonaws.com/testtxt_807
7791789?Content-Type=text%2Fplain&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-
Credential=AKIAYT27POQIXSWAXA55%2F20220804%2Feu-west-3%2Fs3%2Faws4_
request&X-Amz-Date=20220804T125538Z&X-Amz-Expires=60&X-Amz-Signature=0619f26
a95b76d2e18dc54a392135d7a63b0a8cc6d7af92189d0ed47fa57fb9e&X-Amz-SignedHeaders=host"
}
```

# Media Resource

## 1. `GET /media`

#### Request Response

```json
{
    "data": [
        {
            "id": "d7ca88ff-d6c8-43e9-b5a1-9f9f548c4371",
            "name": "testmedia",
            "extName": "mp4",
            "key": "testmedia_1649609943",
            "contentType": "video/mp4",
            "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
            "updatedAt": "2022-08-04T13:36:49.178Z",
            "createdAt": "2022-08-04T13:36:49.178Z"
        },
        {
            "id": "26fce8d9-8c04-4724-8710-ce27b099f666",
            "name": "testMediaFile",
            "extName": "mp4",
            "key": "testmedia_4157919015",
            "contentType": "video/mp4",
            "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
            "updatedAt": "2022-08-04T13:43:11.850Z",
            "createdAt": "2022-08-04T13:38:24.283Z"
        }
    ],
    "total": 3
}
```

### Possible Queries :

#### Pagination

-   `?skip=&take=`

**_Skip_** defines the **_page_** while **_take_** defines **_pageSize_**

#### Sorting

-   `orderBy=`

orderBy can sort by 3 different types : **_Number,String and Dates_**

#### Example with String

-   `orderBy=asc:name `

This query will sort media by name in ascending order

#### Example with Number

-   `orderBy=asc:numberProp`

This query will sort media by numberProp in ascending order

#### Example with Dates

-   `orderBy=desc:createdAt`

This query will sort media in descending by the time they were created

#### Filtering

-   `fieldName=`

Filtering can be split into three categories : **_String, Number, Dates_**

#### Example with String

-   `name=cs:ballImage`

This query will return all media with the name "ballImage" in case sensitive. If you want to filter without case sensitivity remove the `cs:`

#### Example with Numbers

-   `numberProp=gt:19&numberProp=lt:50`

This query will return all media files with numberProp greater than 19 and lesser than 50. (You can also use `lte:` lesser or equal to and `gte:` greater or equal to)

#### Example with Dates

-   `createdAt=gt:2022-07-15T14:07:13.377Z&createdAt=lt:2022-09-15T14:07:13.377Z`

This query will return all documents who were created between 07 and 09

#### Selecting

-   `select=`

This query allows you to select cerain fields to be shown (When selecting a field all other fields wont be shown. If you want to get more than one field you can use 2 selects or 3 selects etc...

#### Example

-   `select=key&select=id`

**_Bear in mind that you can combine those as much as you like._**

## 2. `GET /media/:key`

This query allows you to get a media file by its key (key is stored in the AWS S3 Bucket).

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Response

```json
{
    "databaseResponse": {
        "id": "26fce8d9-8c04-4724-8710-ce27b099f666",
        "name": "testmedia",
        "extName": "mp4",
        "key": "testmedia_4157919015",
        "contentType": "video/mp4",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:38:24.283Z",
        "createdAt": "2022-08-04T13:38:24.283Z"
    },
    "url": "d3808n7nkp1k3g.cloudfront.net/testmedia_4157919015"
}
```

## 3. `POST /media`

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Body

```json
{
    "extName" : "mp4",
    "fileName" : "testmedia"
}
```
#### Request Response

```json
{
    "databaseResponse": {
        "id": "26fce8d9-8c04-4724-8710-ce27b099f666",
        "name": "testmedia",
        "extName": "mp4",
        "key": "testmedia_4157919015",
        "contentType": "video/mp4",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:38:24.283Z",
        "createdAt": "2022-08-04T13:38:24.283Z"
    },
    "preSignedUrl": "https://warehouse-video-storage.s3.eu-west-3.amazonaws.com/testmedia_4157919015?
Content-Type=video%2Fmp4&X-Am
z-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAYT27POQIXSWAXA55%2F20220804%2Feu-west-3%2Fs3%2Faws4
_request&X-Amz-Date=20220804T133824Z&X-Amz-Expires=60&X-Amz-Signature=2a4bf42ff014c
bf86b1ae4b602c09c1a3e5a26ff279ea8593658eed0fb4d6f5d&X-Amz-SignedHeaders=host"
}
```

## 4. `DELETE /media/:key`

* Delete a media file both from AWS S3 Bucket and our Database by key.

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Response

```json
{
    "databaseResponse": {
        "id": "26fce8d9-8c04-4724-8710-ce27b099f666",
        "name": "testMediaFile",
        "extName": "mp4",
        "key": "testmedia_4157919015",
        "contentType": "video/mp4",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:43:11.850Z",
        "createdAt": "2022-08-04T13:38:24.283Z"
    },
    "awsResponse": {}
}
```

## 5. `PUT /media`

* This can not change the key in AWS as it can not be changed. It will only change the name in our db !

#### Request Headers

-   `Authorization : Bearer {token}`

#### Request Body

```json
{
    "extName" : "mp4",
    "fileName" : "testMediaFile"
}
```
#### Request Response

```json
{
    "databaseResponse": {
        "id": "26fce8d9-8c04-4724-8710-ce27b099f666",
        "name": "testMediaFile",
        "extName": "mp4",
        "key": "testmedia_4157919015",
        "contentType": "video/mp4",
        "userId": "fdd5ad30-953d-4f74-8e49-9ecb3ec18d14",
        "updatedAt": "2022-08-04T13:43:11.850Z",
        "createdAt": "2022-08-04T13:38:24.283Z"
    },
    "presignedUrl": "https://warehouse-video-storage.s3.eu-west-3.amazonaws.com/
testmedia_4157919015?Content-Type
=video%2Fmp4&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAYT27POQ
IXSWAXA55%2F20220804%2Feu-west-3%2Fs3%2Faws4_request&X-Amz-Date=20220804T134311Z&
X-Amz-Expires=900&X-Amz-Signature=d4da642329fd954b79
6afb7d05ce6b5c2f810a909bbe97c890cfe73a273b3a92&X-
Amz-SignedHeaders=host"
}
```
# Deployment

***We now have a running app but only we can access it through the internet, in order to share this app we have to deploy it first***

## Digital Ocean

***Digital Ocean provides us with a cloud infrastructure as PAAS (Platform as a service). It gives us access to droplets (virual machines) on which we can setup our app and get it running really easily.***

### Creating a droplet (virtual machine)

1. Create a [Digital Ocean account here](https://www.digitalocean.com/go/developer-brand?utm_campaign=emea_brand_kw_en_cpc&utm_adgroup=digitalocean_exact_exact&_keyword=digital%20ocean&_device=c&_adposition=&utm_content=conversion&utm_medium=cpc&utm_source=google&gclid=CjwKCAjwi8iXBhBeEiwAKbUofeMnb-UBwrEpAvXt3t7KIS1lotZCGqHCgNJM_05m25pH1YXe5vq3JRoCaBIQAvD_BwE)

2. After creating it you will be asked what kind of app you want to create. Choose ***virtual machine***. 

3. In order to verify your account you now have to add payment method. At the very top of the page there will be a button ***"Add payment method"***.

4. After adding a payment method we go back to creating a ***droplet*** ( virtual machine )
    - For image choose Ubuntu
    - For plan choose whatever suits your purpose (For this tutorial I chose Basic)
    - For CPU options choose again whatever suits your need
    - For Volume choose again whatever suits you ( Volume is independant storage that can be moved from one droplet to another within the same region)
    - For region choose something close to the audience you are targeting (Generally it wont matter that much)
    - For authentication choose whatever you need. SSH is generally safer option.
    - For additional options choose everything that is free ( its free after all )
    - On the finalizy and create section dont forget to check how many droplets you are creating before procceeding
    - Finally select the project in which you want to place the droplet (if you havent used DigitalOcean before you will have a only one project)
    - Click ***Create Droplet***
    - !!! ***Keep in mind that DigitalOcean will keep charging you money until you delete the droplet*** !!!

### Deploying our app to the droplet

At first there will be a lot of things missing from the virtual machine
like ***postgress, npm, node*** etc... so we need to set each one of them up.

1. ***Entering the virtual machine*** (Sounds like a movie title)
    - Go to Access (Side menu)
    - Press on ***Launch Droplet Console***
    
1.1 ***Those are some commands that will be used a lot when operating on the droplet*** :

    - ls : ***Lists all files and folders in the current directory***
    
    - cd ../ : ***Go back one folder***
    
    - cd folderName : ***Go in the specified folder***
    
    - mkdir dirName : ***Makes a folder with in the current directory with the specified name***
    
    - nano fileName : ***edit the file using the nano editor***
    
2. ***Creating a directory for our app***
    - You can create the directory wherever you like but for this tutorial we will create it in the ***home directory***
    - cd ../  To go back one folder back
    - cd home To go into home
    - mkdir projects To make a folder nameд projects
    - cd projects To go inside it
    - mkdir appDocs To make a directory for our app
    - cd appDocs To go into the folder
    
3. ***Pulling our app in the directory***
    - The ***droplet*** has ***git*** installed by default so we dont have to bother setting this up alone
    - While in our directory type

    ```bash
    git init
    ```
    - This will make an empty ***git repository*** in the folder
    - Now type this to pull the project :

    ```bash
     git pull [link to your project that you want to pull]
    ```

    - You will be asked for your ***github username***. Fill it
    - After that you will be asked for a ***password***. Note that this is not your ***password*** for the account. You need to generate a ***github personal access token*** and use it instead of a ***password***. If you already know how to do that you can ***skip to 4***.

    - Go to github > Settings > Developer Settings > Personal Access Token > Generate New Token
    - Write whatever note you want
    - For scopes select : repo, write:packages, delete:packages
    - Generate token
    - Copy the token and save it somewhere safe or dont save it at all (Note that if someone gets this token he can access your github account with the permissions you gave the token)
    - Place the token now instead of password
    
4. Setting up npm
    - In order for us to use ***npm*** we need to first install it
    ```bash
    apt install npm
    ```
    - You will probably be prompted that some services need to be restarted. Press Enter.
    
5. Update node to latest stable version
    - Using npm execute this set of commands :
    ```bash
    npm cache clean -f
    ```
    ```bash
    npm install -g n
    ```
    ```bash
    n stable
    ```
    
6. Install dependancies
    - Type this command to install dependancies :

    ```bash
    npm i
    ```

    - If you are getting any errors close the droplet and open in again, then locate to our project and run the command again
    
7. Setting up PostgreSQL
    - First execute this command to install postgreSQL

    ```bash
    sudo apt install postgresql postgresql-contrib
    ```
    
    - Ensure that the service is started by executing this (this will start the service, just to be sure):

    ```bash
    systemctl start postgresql.service
    ```
    - By default, Postgres uses a concept called “roles” to handle authentication and authorization. Upon installation, Postgres is set up to use ident authentication, meaning that it associates Postgres roles with a matching Unix/Linux system account. If a role exists within Postgres, a Unix/Linux username with the same name is able to sign in as that role.
    
    - You can interact with psql typing this (This will sign in posgress account on your Linux server and then enter psql): 

    ```bash
    sudo -u postgres psql
    ```

    - To exit simply type :

    ```cmd
    \q
    ```

7.1 Creating a database for our app

   - Because our app uses prisma we need to create the database manually first and prisma will just fill it with info.

   - Enter into psql like that : 

```bash
sudo -u postgres psql
```
    
   - Now just type this to create a database named appDocs

```bash
CREATE DATABASE appDocs;
```

7.2 Creating a new password for the postgres user

   - Enter psql
```bash
sudo -u postgres psql
```
   - Change password with this
```bash
ALTER USER user_name WITH PASSWORD 'new_password';
```
   - Remember your password you will need it

8. Configuring the .env file

    - Now we have to add our enviromet variables to the .env file in order for our app to work.

    - In our app directory type this
```bash
nano .env
```
   - You have a lot of stuff to fill here so CTRL + INSERT is your best friend here. It is like using CTRL + V but for Linux. 

   - For the PORT you decide. Generally 3030 is used as a standart for APIs.
   - For the database url it is structures like that :
`postgresql://username:password@localhost:5432/databaseName`

   - Example Database info :

```bash
DATABASE_URL = "postgresql://postgres:123456789@localhost:5432/appDocs"
DATABASE_USER = "postgres"
DATABASE_HOST = "localhost"
DATABASE_DATABASE = "appDocs"
DATABASE_PASSWORD = "7oct2001"
```
   - After filling everything press CTRL + X , then press Y, then press Enter (For the nano editor)

9. Running the API

   - Now the only thing left to do is to start the api
   - Executhe these commands in this order in order to quick start the server :
```bash
npm run build
```

```bash
npx prisma migrate dev --name InitialImage
```

```bash
npm run patchDB
```

```bash
npm run seed
```

```bash
npm start
```

   - Now your API is up and running publicly !

10. Accessing the server through the internet 

   - In order to access the API go to Digital Ocean and copy ***ipv4***
   - Paste it into something like postman and add the port after it separated by ":" so it will be something like 87.101.23.67:3030
   - Now you can treat that the exact same way as localhost:3030 with the main difference that now it is publicly accessible for everyone having the IP address and the port.
