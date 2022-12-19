# Docs-API

## Live Demo with Frontend - https://mopdocs.xyz

## What is docs-api and what does it do

The docs API provides you with endpoints with which you can do CRUD operations on files. It also provides you with a cookie-session based authentication and some roles along with it. You can create/read/update/delete : media/documents/users

## Navigation

- [Technologies Used](#Technologies-Used)
- [Setting up the API](#Setting-up-the-API)
- [Setting up AWS](#Setting-up-AWS)
- [Starting the API](#Starting-the-API)
- [How the API works under the hood](#How-the-API-works-under-the-hood)
- [Routes](#Routes)

## Technologies Used

- Express
- Typescript
- PostgreSQL along with Prisma
- Docker
- AWS SDK
- PassportJs Local Strategy

## Setting up the API

In order to run the API, first you need to fill in the .env file. We will go over every property and what it does so dont worry about that. By the way here is a quick .env template you can copy and paste :

```
PORT = 8080
ISHTTPS = "false"

# If you are running the production docker-compose.prod.yml use this (you need a domain for it): 
# DATABASE_URL = "postgresql://postgres:postgres@postgres:5432/docsDB"

# If you are running the local docker-compose.yml (which is default) use this :
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/docsDB"

AWS_BUCKET_NAME = 
AWS_BUCKET_REGION = 
AWS_ACCESS_KEY = 
AWS_SECRET_KEY = 

AWS_MEDIABUCKET_NAME = 
AWS_MEDIABUCKET_REGION = 
```

- PORT : This is the port the API will run on. The docker container will bind port 8080 to port 8080 so leave it like that or change it in both places (both in the .env, the Dockerfile and the docker-compose file)

- ISHTTPS : This specifies if the server should be run in HTTPS or HTTP mode. This should be set to true if you want to run the api outside of a docker container. (In that case you will have to manually create a certificate and a key)

- DATABASE_URL : For a database URL leave uncomment the one you want to use.

- The rest of the fields are all related to AWS. You need to setup an AWS account first and configure it. FOllow [this](#Setting-up-AWS) link here to learn how.


After configuring your .env file, make sure that docker is running and execute this command

```bash
docker compose up
```

This will start the docker containers and it will bind you to them (if you decide to close the terminal you are using the containers will shut down too). If you dont want that execute it like this to run in detached mode :

```bash
docker compose up -d
```

## Setting up AWS

This isnt a guide on AWS so I wont explain what everything does. It will just be a step by step tutorial on how to setup AWS S3 and AWS IAM in order for the API to run

1. Create your AWS account (disclaimer : It requires you to pay $1 to verify identity)
- Go to [this link](https://aws.amazon.com/), press on Create an Account and follow the instructions

2. Create the documents bucket
- In the Search Bar type in "S3" and press on the first thing that pops up
- Press on **Create bucket**
- For a **Bucket Name** choose anything you want > Save this name to **AWS_BUCKET_NAME** in your .env
- For a region choose something close to your desired audience > Save this to **AWS_BUCKET_REGION** (just the title) example : us-east-1
- Make sure **Block all public access** is checked

3. Create the media bucket
- In the **Search Bar** type in "S3" and press on the first thing that pops up
- Press on **Create bucket**
- For a **Bucket Name** choose anything you want > Save this name to **AWS_MEDIABUCKET_NAME** in your .env
- For a region choose something close to your desired audience > Save this to **AWS_MEDIABUCKET_REGION** (just the title) example : us-east-1
- Make sure **Block all public access** is checked

4. Create a policy for the buckets
- In the **Seaarch Bar** type in "IAM" and press the first thing that pops up
- In the side-menu go to **Policies**
- Click on **Create a policy**
- Click on **JSON** and paste this there :
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObjectAcl",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::{docs_bucket_name}/*",
                "arn:aws:s3:::{media_bucket_name}/*"
            ]
        }
    ]
}
```
- Replace **{docs_bucket_name}** and **{media_bucket_name}** with your documents bucket and media bucket's names (be sure to remove the curly braces)
- Press **Next**
- Press **Next**

5. Create the IAM user
- In the **Seaarch Bar** type in "IAM" and press the first thing that pops up
- In the side-menu go to **Users**
- Click on **Add users**
- Give him a descriptive name, like for example : "app-docs-api"
- Select **Programatic Access** and Click **Next**
- Click on **Attach existing policy directly**, find the policy you just created and select it
- Press **Next**
- Click on next until you see Access Key and Private key. > Fill them in your .env 
AWS_ACCESS_KEY and AWS_SECRET_KEY
- Finish

Thats it. You are ready !

### Potential Problems 

1. CORS Problems

- If you have any CORS problems go to your buckets > permissions > CORS and paste this 

```bash
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "DELETE"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": []
    }
]
```

## Starting the API

In order to start the API you must have filled in the .env and configured AWS correctly. If you now need to open Docker and run this command in the root of the project 

```
docker compose up -d
```

## How the API works under the hood

### Database Tables

The API stores data about users and files in it's database which is PostgreSQL. In the database we have 3 tables that  are most important

- User
- File
- Session
- Role

1. User Table 

The user table holds information about registered users, it holds email, hashed password, username, dateCreated, dateUpdated, roles and files

2. File

The File table provides info about a file like : name, extension, contentType, key (AWS key), status ('deleted' or 'active') and owner

3. Session

The Session table holds information about user sessions. It has : id, sid (cookie id), data and expiresAt

4. Role

The Role table holds information about roles. It holds info about : title, users, scopes (permissions like read:users, write:files)

### Authentication 

The API handles the authentication using the PassportJs Local Strategy with Express Session. The authentication is cookie based. The general authentication flow is that : 

1. Client registers an account
2. Client logs in with the account and server send him a cookie. This cookie will be attached to every request from this point on, providing information about the user (It holds the user id)
3. When the server receives a request with this cookie, the request passes through a middleware that validates the cookie and deserializes the user. After that there are 2 important properties that are attached to the request object. req.isAuthenticated() and req.user The req.user object is basically the deserialized user pulled from the database and req.isAuthenticated() returns a boolean that tells us if the user is authenticated ot not.
4. The request then passes through the isAuthenticated middleware that rejects the request if the user is not authenticated
5. If it passes, it goes to the custom roleGuard middleware that check if the user possesses the role needed for the specific route (Users are given role "User" by default on registration)

### File managment

The api handles files fairly simple. We just store infolike fileName, contentType and extName and key but the actual file is stored in AWS S3 bucket. When creating or getting a file we  simply return the database object of the file along with a preSignedUrl from AWS that the client needs to use to perform the action he wants. 

## Routes

... Currently working on Routes documentation using Swagger. When ready I will post the link here
