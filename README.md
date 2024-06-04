# Slack gateway for Brave Search Summarizer API 

It's easy to deploy in your own AWS Account, and add to your own Slack Workspace. 

### Features
- In DMs it responds to all messages
- In channels it responds only to @mentions, and always replies in thread
- Renders answers containing markdown - e.g. headings, lists, bold, italics, tables, etc. 
- Provides Source Attribution - see references to sources used by the model
- Aware of multiple users - when it's tagged in a thread, it knows who said what, and when - so it can contribute in context and accurately summarize the thread when asked.  
- Reset and start new conversation in DM channel by using `/new_conversation`

Follow the instructions below to deploy the project to your own AWS account and Slack workspace, and start experimenting!

## Deploy the solution

### Prerequisites

You need to have an AWS account and an IAM Role/User with permissions to create and manage the necessary resources and components for this application. *(If you do not have an AWS account, please see [How do I create and activate a new Amazon Web Services account?](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/))*

You also need to have an existing, working `Brave AI Pro API Key`. If you haven't set one up yet, see the [Brave Getting Started Guide](https://api.search.brave.com/app/documentation/web-search/get-started)

### 1. Deploy the stack

We've made this easy by providing pre-built AWS CloudFormation templates that deploy everything you need in your AWS account.

If you are a developer, and you want to build, deploy and/or publish the solution from code, we've made that easy too! See [Developer README](./README_DEVELOPERS.md)

1. Log into the [AWS console](https://console.aws.amazon.com/) if you are not already.
2. Choose one of the **Launch Stack** buttons below for your desired AWS region to open the AWS CloudFormation console and create a new stack.
4. Enter the following parameters:
    1. `Stack Name`: Name your App, e.g. BRAVE-SLACK-GATEWAY.
    5. `ContextDaysToLive`: Just leave this as the default (90 days)


When your CloudFormation stack status is CREATE_COMPLETE, choose the **Outputs** tab, and keep it open - you'll need it below.


### 2. Configure your Slack application

#### 2.2 Create your app

Now you can create your new app in Slack!  

1. Create a Slack app: https://api.slack.com/apps from the generated manifest - copy / paste from the stack output: `SlackAppManifest`.
2. Go to `App Home`, scroll down to the section `Show Tabs` and enable `Message Tab` then check the box `Allow users to send Slash commands and messages from the messages tab` - This is a required step to enable your user to send messages to your app

#### 2.3 Add your app in your workspace

Let's now add your app into your workspace, this is required to generate the `Bot User OAuth Token` value that will be needed in the next step

1. Go to OAuth & Permissions (in api.slack.com) and click `Install to Workspace`, this will generate the OAuth token
2. In Slack, go to your workspace
2. Click on your workspace name > Tools and settings > Manage apps
3. Click on your newly created app
4. In the right pane, click on "Open in App Directory"
5. Click "Open in Slack"

### 3. Configure your Secrets in AWS

Let's configure your Slack secrets in order to (1) verify the signature of each request, (2) post on behalf of your bot

> **IMPORTANT**
> In this example we are not enabling Slack token rotation. Enable it for a production app by implementing
> rotation via AWS Secrets Manager. 
> Please create an issue (or, better yet, a pull request!) in this repo if you want this feature added to a future version.

1. Login to your AWS console
2. In your AWS account go to Secret manager, using the URL shown in the stack output: `SlackSecretConsoleUrl`.
3. Choose `Retrieve secret value`
4. Choose `Edit`
5. Replace the value of `Signing Secret`<sup>\*</sup> and `Bot User OAuth Token`, you will find those values in the Slack application configuration under `Basic Information` and `OAuth & Permissions`. <sup>\*</sup>*(Pro tip: Be careful you don't accidentally copy 'Client Secret' (wrong) instead of 'Signing Secret' (right)!)*
7. Next we'll configure the Brave API Key, using the URL shown in the stack output: `BraveSecretConsoleUrl`.
8. Choose `Retrieve secret value`
9. Choose `Edit`
10. Replace the value of `<Replace with Brave API Key>` with the API Key provided by Brave. Ensure the key is a `AI Pro` level subscription. 


### Say hello
> Time to say Hi!

1. Go to Slack
2. Under Apps > Manage, add your new Brave app
3. Optionally add your app to team channels
4. In the app DM channel, say *Hello*. In a team channel, ask it for help with an @mention.
5. Enjoy.

## Contributing, and reporting issues

We welcome your contributions to our project. Whether it's a bug report, new feature, correction, or additional
documentation, we greatly value feedback and contributions from our community.

See [CONTRIBUTING](CONTRIBUTING.md) for more information.

## Security

See [Security issue notifications](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the [LICENSE](./LICENSE) file.
