import { IConfigReader, ILogger, Config, IConfig } from "merapi";
import { suite, test } from "mocha-typescript";
import { stub, spy, assert } from "sinon";
import { IHelper } from "../interfaces/main";
import { readFileSync } from "fs";
import { safeLoad } from "js-yaml";
import Helper from "../components/scripts/helper";
import Api from "../components/api";
import Deployment from "../components/deployment";
import Zaun from "../components/zaun-client/zaun";
import { v4 as uuid } from "node-uuid";

@suite class DeploymentTest {
    private config: IConfig;
    private helper: IHelper;
    private api: any;
    private deployment: any;
    private emptyDeploymentObj = {
        name: "test",
        botId: "739b5e9f-d5e1-44b1-93a8-954d291df170",
        botVersion: "1.0.5",
        channels: {}
    }
    private deploymentObj = {
        name: "test",
        botId: "739b5e9f-d5e1-44b1-93a8-954d291df170",
        botVersion: "1.0.5",
        channels: {
            "fb": "a22867dd-ce49-4afe-b7d1-3199c01e1c51",
            "line": "b02eb207-8f8a-480d-8c32-606b0fa7dfe7"
        }
    };
    private channelObj = {
        name: "fb",
        id: this.deploymentObj.channels["fb"],
        type: "messenger",
        token: "tokenChannel",
        refreshToken: "refreshToken",
        secret: "secretKey",
        url: "http://url"
    }

    constructor() {
        let configJson = safeLoad(readFileSync("./service.yml", "utf8"));
        let zaun = Zaun();
        this.config = Config.create(configJson);
        this.helper = new Helper(this.config);
        this.api = new Api(this.helper, zaun);
        this.deployment = new Deployment(this.helper, this.api, this.config);
    }

    @test async "function deploy should create deployment successfully"() {
        let createdDeploymentId = uuid();
        let optsCreateDeployment = {
            body: {
                name: this.deploymentObj.name,
                botVersion: this.deploymentObj.botVersion,
                channels: {}
            }
        };
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getBotVersionStub = stub(this.api.botApi, "botsBotIdVersionsGet").callsFake((botId, callback) => {
            callback(null, { versions: [ this.deploymentObj.botVersion ], latest: this.deploymentObj.botVersion });
        });
        let getDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdGet").callsFake((botId, deploymentId, callback) => {
            callback(new Error("Deployment not found."));
        });
        let createDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsPost").callsFake((botId, opts, callback) => {
            callback(null, { ...this.deploymentObj, channels: {}, id: createdDeploymentId });
        });
        let consoleLogStub = stub(console, "log");
        let consoleDirStub = stub(console, "dir");

        await this.deployment.deploy(this.deploymentObj.name, this.deploymentObj.botVersion, {});

        getBotIdStub.restore();
        getBotVersionStub.restore();
        getDeploymentStub.restore();
        createDeploymentStub.restore();
        consoleLogStub.restore();
        consoleDirStub.restore();
        assert.calledOnce(getBotVersionStub);
        assert.calledOnce(getDeploymentStub);
        assert.calledOnce(createDeploymentStub);
        assert.calledOnce(consoleLogStub);
        assert.calledOnce(consoleDirStub);
        assert.calledWith(getBotVersionStub, this.deploymentObj.botId);
        assert.calledWith(getDeploymentStub, this.deploymentObj.botId, this.deploymentObj.name);
        assert.calledWith(createDeploymentStub, this.deploymentObj.botId, optsCreateDeployment);
        assert.calledWith(consoleLogStub, "DEPLOYMENT CREATED SUCCESSFULLY");
        assert.calledWith(consoleDirStub, { ...this.deploymentObj, channels: {}, id: createdDeploymentId });
    }

    @test async "function deploy should update deployment successfully if deployment has been created"() {
        let createdDeploymentId = uuid();
        let body = {
            name: this.deploymentObj.name,
            botVersion: this.deploymentObj.botVersion
        };
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getBotVersionStub = stub(this.api.botApi, "botsBotIdVersionsGet").callsFake((botId, callback) => {
            callback(null, { versions: [ "1.0.0", "1.0.1", this.deploymentObj.botVersion ], latest: this.deploymentObj.botVersion });
        });
        let getDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdGet").callsFake((botId, deploymentId, callback) => {
            callback(null, this.deploymentObj);
        });
        let updateDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdPut").callsFake((botId, deploymentId, body, callback) => {
            callback(null, { ...this.deploymentObj, id: createdDeploymentId });
        });
        let consoleLogStub = stub(console, "log");
        let consoleDirStub = stub(console, "dir");

        await this.deployment.deploy(this.deploymentObj.name, null, {});

        getBotIdStub.restore();
        getBotVersionStub.restore();
        getDeploymentStub.restore();
        updateDeploymentStub.restore();
        consoleLogStub.restore();
        consoleDirStub.restore();
        assert.calledOnce(getBotVersionStub);
        assert.calledOnce(getDeploymentStub);
        assert.calledOnce(updateDeploymentStub);
        assert.calledOnce(consoleLogStub);
        assert.calledOnce(consoleDirStub);
        assert.calledWith(getBotVersionStub, this.deploymentObj.botId);
        assert.calledWith(getDeploymentStub, this.deploymentObj.botId, this.deploymentObj.name);
        assert.calledWith(updateDeploymentStub, this.deploymentObj.botId, this.deploymentObj.name, body);
        assert.calledWith(consoleLogStub, "DEPLOYMENT UPDATED SUCCESSFULLY");
        assert.calledWith(consoleDirStub, { ...this.deploymentObj, id: createdDeploymentId });
    }

    @test async "function deploy throw error if bot with botVersion is undefined"() {
        let createdDeploymentId = uuid();
        let optsCreateDeployment = {
            body: {
                name: this.deploymentObj.name,
                botVersion: this.deploymentObj.botVersion,
                channels: {}
            }
        };
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getBotVersionStub = stub(this.api.botApi, "botsBotIdVersionsGet").callsFake((botId, callback) => {
            callback(null, { versions: [ this.deploymentObj.botVersion ], latest: this.deploymentObj.botVersion });
        });
        let consoleLogStub = stub(console, "log");

        await this.deployment.deploy(this.deploymentObj.name, "1.0.6", {});
        
        getBotIdStub.restore();
        getBotVersionStub.restore();
        consoleLogStub.restore();
        assert.calledOnce(getBotVersionStub);
        assert.calledOnce(consoleLogStub);
        assert.calledWith(getBotVersionStub, this.deploymentObj.botId);
        assert.calledWith(consoleLogStub, "INVALID_VERSION");
    }

    @test async "function add channel should add channel to deployment successfully"() {
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdGet").callsFake((botId, deploymentId, callback) => {
            callback(null, this.emptyDeploymentObj);
        });
        let createChannelStub = stub(this.api.channelApi, "botsBotIdDeploymentsDeploymentIdChannelsPost").callsFake((body, botId, deploymentId, callback) => {
            callback(null, this.channelObj);
        })
        let consoleLogStub = stub(console, "log");
        let channels: {[name: string]: string} = {};
        channels[this.channelObj.name] = this.channelObj.id;
        let channelData = {
            id: this.channelObj.id,
            name: this.channelObj.name,
            type: this.channelObj.type,
            url: this.channelObj.url,
            options: {
                token: this.channelObj.token,
                refreshToken: this.channelObj.refreshToken,
                secret: this.channelObj.secret
            }
        };

        await this.deployment.addChannel(this.deploymentObj.name, "fb", { data: JSON.stringify(this.channelObj) });

        getBotIdStub.restore();
        getDeploymentStub.restore();
        consoleLogStub.restore();
        createChannelStub.restore();
        assert.calledOnce(getDeploymentStub);
        assert.calledOnce(createChannelStub);
        assert.calledWith(createChannelStub, channelData, this.deploymentObj.botId, this.deploymentObj.name);
        assert.calledWith(consoleLogStub, "CHANNEL ADDED SUCCESSFULLY");
        assert.calledWith(consoleLogStub, { ...this.emptyDeploymentObj, channels });
    }

    @test async "function add channel should show error if channel name added has been used"() {
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdGet").callsFake((botId, deploymentId, callback) => {
            callback(null, this.deploymentObj);
        });
        let consoleLogStub = stub(console, "log");

        await this.deployment.addChannel(this.deploymentObj.name, "fb", {});

        getBotIdStub.restore();
        getDeploymentStub.restore();
        consoleLogStub.restore();
        assert.calledOnce(getDeploymentStub);
        assert.calledWith(consoleLogStub, "CHANNEL NAME HAS BEEN USED");
    }

    @test async "function remove channel should remove channel successfully"() {
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdGet").callsFake((botId, deploymentId, callback) => {
            callback(null, this.deploymentObj);
        });
        let removeChannelStub = stub(this.api.channelApi, "botsBotIdDeploymentsDeploymentIdChannelsChannelIdDelete").callsFake((botId, deploymentId, channelId, callback) => {
            callback();
        });
        let consoleLogStub = stub(console, "log");

        await this.deployment.removeChannel(this.deploymentObj.name, "fb", {});

        getBotIdStub.restore();
        getDeploymentStub.restore();
        removeChannelStub.restore();
        consoleLogStub.restore();
        assert.calledOnce(getDeploymentStub);
        assert.calledOnce(removeChannelStub);
        assert.calledOnce(consoleLogStub);
        assert.calledWith(removeChannelStub, this.deploymentObj.botId, this.deploymentObj.name, this.channelObj.id);
        assert.calledWith(consoleLogStub, "CHANNEL REMOVED SUCCESSFULLY");
    }
    
    @test async "function remove channel should throw error if channel not found in deployment"() {
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let getDeploymentStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdGet").callsFake((botId, deploymentId, callback) => {
            callback(null, this.emptyDeploymentObj);
        });
        let consoleLogStub = stub(console, "log");

        await this.deployment.removeChannel(this.deploymentObj.name, "fb", {});

        getBotIdStub.restore();
        getDeploymentStub.restore();
        consoleLogStub.restore();
        assert.calledOnce(getDeploymentStub);
        assert.calledWith(consoleLogStub, "CHANNEL NOT FOUND");
    }

    @test async "should call zaun api to drop deployment"() {
        let getBotIdStub = stub(this.helper, "getBotId").returns(this.deploymentObj.botId);
        let deploymentApiDeleteStub = stub(this.api.deploymentApi, "botsBotIdDeploymentsDeploymentIdDelete").callsFake((botId, deploymentId, callback) => {
            callback(null, this.deploymentObj);
        });
        let consoleStub = stub(console, "log");

        await this.deployment.drop(this.deploymentObj.name, {});

        consoleStub.restore();
        getBotIdStub.restore();
        deploymentApiDeleteStub.restore();
        assert.calledOnce(deploymentApiDeleteStub);
        assert.calledWith(consoleStub, this.deploymentObj);
        assert.calledWith(consoleStub, "DEPLOYMENT DELETED SUCCESSFULLY");
    }
}