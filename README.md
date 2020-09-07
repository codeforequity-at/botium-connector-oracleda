# botium-connector-oracleda
Botium Connector for Oracle Digital Assistant

[![NPM](https://nodei.co/npm/botium-connector-oracleda.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-oracleda/)

[![Codeship Status for codeforequity-at/botium-connector-oracleda](https://app.codeship.com/projects/ac5ab3a0-d0f5-0138-cac3-16239a5027f5/status?branch=master)](https://app.codeship.com/projects/408148)(https://app.codeship.com/projects/366879)
[![npm version](https://badge.fury.io/js/botium-connector-oracleda.svg)](https://badge.fury.io/js/botium-connector-oracleda)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()


This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your [Oracle Digital Assistant](https://www.oracle.com/application-development/cloud-services/digital-assistant/) chatbot.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works
Botium connects to the API of your Oracle Digital Assistant chatbot.

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at)

## Requirements
* **Node.js and NPM**
* a **Oracle Digital Assistant bot**
* a **project directory** on your workstation to hold test cases and Botium configuration

## Install Botium and Oracle Digital Assistant Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-oracleda
> botium-cli init
> botium-cli run
```

When using __Botium Bindings__:

```
> npm install -g botium-bindings
> npm install -g botium-connector-oracleda
> botium-bindings init mocha
> npm install && npm run mocha
```

When using __Botium Box__:

_Already integrated into Botium Box, no setup required_

## Connecting Oracle Digital Assistant chatbot to Botium

Process is very simple, you have to know just the Webhook URL and the Secret Key for your chatbot.
  
Create a botium.json with this URL and Secret in your project directory: 

```
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "<whatever>",
      "CONTAINERMODE": "oracleda",
      "ORACLE_WEBHOOK_URL": "...",
      "ORACLE_WEBHOOK_SECRET": "..."
    }
  }
}
```

To check the configuration, run the emulator (Botium CLI required) to bring up a chat interface in your terminal window:

```
> botium-cli emulator
```

Botium setup is ready, you can begin to write your [BotiumScript](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/491664/Botium+Scripting+-+BotiumScript) files.

## How to start samples

There is a small demo in [samples](./samples) with Botium Bindings. It uses real Oracle Digital Assistant API.

### Real Oracle Digital Assistant API sample

* Setup your Oracle Digital Assistant in [oracle cloud](https://www.oracle.com/application-development/cloud-services/digital-assistant/)
(In the example there are test cases for `CbPizzaBot`, which can be pulled from the Digital Assistant store.)
* Adapt botium.json in the sample directory: 
    * Change Webhook URL
    * Change Webhook secret
    * Start `inbound-proxy` command with [Botium CLI](https://github.com/codeforequity-at/botium-cli/) 
    (by default it will listen on `http://127.0.0.1:45100/`)
    * In your Oracle Digital Assistant you need to set `Outgoing Webhook URI` according to the previous step set up inbound-proxy url. 
    (To make this localhost url public you can use e.g. [ngrok](https://ngrok.com/))
    * Change inbound redis url if it needs
* Install packages, run the test

```
> cd ./samples/real
> npm install && npm test
```

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __oracleda__ to activate this connector.

### ORACLE_WEBHOOK_URL
Oracle Digital Assistant channel webhook url

### ORACLE_WEBHOOK_SECRET
Oracle Digital Assistant channel secret key

