const assert = require("assert");
const sinon = require("sinon");
const ACTIONS = require("../constants/ACTIONS");
const express = require("express");
const EndpointsGenerator = require("../EndpointsGenerator");
const ActionFunctionFactory = require("../ActionFunctionFactory");
const { authOptions } = require("../constants/ROUTE_CONFIG_ENUMS");
const DEFAULT_ROUTES_CONFIG = require("../constants/DEFAULT_ROUTES_CONFIG");

const sampleJwtSecret = "mySecret";

// dependency handling: either delete dependents or update them to null
const SAMPLE_ENTITIES = {
  categories: "categories",
  comments: "comments",
  products: "products",
  users: "users",
};

const VALID_DB_ADAPTATION = {
  [ACTIONS.findMany]: "find",
  [ACTIONS.findById]: "findById",
  [ACTIONS.createOne]: "createNewFor",
  [ACTIONS.updateOne]: "updateFor",
  [ACTIONS.deleteOne]: "deleteFor",
  [ACTIONS.save]: "save",
};

const createTokenStub = sinon.stub();
const isAdminStub = sinon.stub();

const mockReq = { req: "requestObject" };
const mockRes = { res: "responseObject" };
function mockNext() {}

// db module stubs
// should have unadapted client interface
const SampleObjectDbModuleStub = {
  find: sinon.stub(),
  findById: sinon.stub(),
  createNewFor: sinon.stub(),
  updateFor: sinon.stub(),
  deleteFor: sinon.stub(),
  save: sinon.stub(),
};

// router stubs
const rootRoutesStub = {
  get: sinon.stub().callsFake(() => rootRoutesStub),
  post: sinon.stub().callsFake(() => rootRoutesStub),
};

const idRoutesStub = {
  get: sinon.stub().callsFake(() => idRoutesStub),
  put: sinon.stub().callsFake(() => idRoutesStub),
  delete: sinon.stub().callsFake(() => idRoutesStub),
};

const expressRouterStub = {
  route: sinon.stub().callsFake((route) => {
    if (route === "/:id") {
      return idRoutesStub;
    }
    return rootRoutesStub;
  }),
};

const routerFake = sinon.fake.returns(expressRouterStub); // this mocks and spies on express.Router()
sinon.stub(express, "Router").callsFake(routerFake); // replaces express's Router with our stub

// const ActionFunctionFactoryStub = {
//   getFunctionForActionGET: sinon.stub(),
// };

const actionFunctionStub = sinon.stub().withArgs(mockReq, mockRes, mockNext);
sinon
  .stub(ActionFunctionFactory, "getFunctionForAction")
  .callsFake(() => actionFunctionStub);

describe("Endpoints Generator: using custom database", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error if client only adapted their DB interface partially", () => {
    const thirdPartyDatabase = {
      [ACTIONS.findMany]: "find",
      [ACTIONS.deleteOne]: "deleteFor",
      [ACTIONS.save]: "save",
    };
    let error = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        thirdPartyDatabase
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when called again after configuring entity", () => {
    let error = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.useCustomDatabase();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Endpoints Generator: Database module adaptation", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error when useCustomDatabase was not called", () => {
    let error = null;
    try {
      EndpointsGenerator.adaptClientDBInterface(VALID_DB_ADAPTATION);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.throws(() => {
      EndpointsGenerator.adaptClientDBInterface(VALID_DB_ADAPTATION);
    });
    assert.notEqual(error, null);
  });

  it("should adapt module methods correctly when all api's are provided", () => {
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );
      result = EndpointsGenerator.getDBInterface();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.deepStrictEqual(VALID_DB_ADAPTATION, result);
  });

  it("should adapt module methods correctly when some api's are marked false due to not implemented", () => {
    const thirdPartyDatabase = {
      [ACTIONS.findMany]: "find",
      [ACTIONS.findById]: "findById",
      [ACTIONS.createOne]: "createNewFor",
      [ACTIONS.updateOne]: "updateFor",
      [ACTIONS.deleteOne]: "deleteFor",
      [ACTIONS.save]: false,
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        thirdPartyDatabase
      );
      result = EndpointsGenerator.getDBInterface();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.deepStrictEqual(
      { ...VALID_DB_ADAPTATION, [ACTIONS.save]: false },
      result
    );
  });

  it("should throw error when some api's are missing", () => {
    const thirdPartyDatabase = {
      [ACTIONS.findMany]: "find",
      [ACTIONS.deleteOne]: "deleteFor",
      [ACTIONS.save]: "save",
    };
    let error = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        thirdPartyDatabase
      );
      result = EndpointsGenerator.getDBInterface();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.throws(() => {
      EndpointsGenerator.adaptClientDBInterface(thirdPartyDatabase);
    });
    assert.notEqual(error, null);
  });
});

describe("Endpoints Generator: Getting Entity Names", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should return an object with entity string names", () => {
    const expectedEntityNames = {
      categories: "categories",
      comments: "comments",
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      result = EndpointsGenerator.getEntityNames();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityNames);
  });
});

describe("Endpoints Generator: Entity Configuration", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error when using custom database but trying to configure entity before adapting their interfaces", () => {
    let error = null;
    try {
      EndpointsGenerator.useCustomDatabase().configureEntity(
        SAMPLE_ENTITIES.categories
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when configuring single entity twice callback", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when entity is primary entity but did not provide createTokenCb callback", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
      });
    } catch (e) {
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when entity is primary entity but did not provide isAdminCb callback", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
      });
    } catch (e) {
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should configure single entity successfully without options", () => {
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityConfiguration);
  });

  it("should configure single entity successfully with options", () => {
    const createTokenStub = sinon.stub();
    const expectedEntityConfiguration = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity("users", {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      });
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityConfiguration);
  });

  it("should configure multiple entities successfully without options", () => {
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
      },
      comments: {
        name: "comments",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityConfiguration);
  });
});

describe("Endpoints Generator: Configuring Entity DB Modules with method chaining", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("Should add appropriate DB Module to a single entity as callback successfully", () => {
    const entityModuleStub = sinon.stub();
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
        DBModule: entityModuleStub,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(
        SAMPLE_ENTITIES.categories
      ).addDBModule(entityModuleStub);

      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityConfiguration);
  });

  it("Should add appropriate DB Module to a single entity as object successfully", () => {
    const entityModuleObj = {
      name: "sampleObject",
    };
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
        DBModule: entityModuleObj,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(
        SAMPLE_ENTITIES.categories
      ).addDBModule(entityModuleObj);

      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityConfiguration);
  });

  it("Should add appropriate DB Modules callbacks to a multiple entities successfully", () => {
    const cateogoriesModuleStub = sinon.stub();
    const commentModulesStub = sinon.stub();
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
        DBModule: cateogoriesModuleStub,
      },
      comments: {
        name: "comments",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
        DBModule: commentModulesStub,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(
        SAMPLE_ENTITIES.categories
      ).addDBModule(cateogoriesModuleStub);

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments).addDBModule(
        commentModulesStub
      );

      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedEntityConfiguration);
  });

  it("Should throw error if addDbModule is called without first calling configureEntity", () => {
    const entityModuleStub = sinon.stub();
    let error = null;
    try {
      EndpointsGenerator.addDBModule(entityModuleStub);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });
});

describe("Endpoints Generator: Configuring Entity Dependents", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error when addDependents is called without first calling configureEntity", () => {
    let error = null;
    try {
      EndpointsGenerator.addDependents("categories");
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when passing invalid string entity in dependents array", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users).addDependents([
        "johny",
      ]);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when passing object with invalid entity in dependents array", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users).addDependents([
        {
          entity: "johny",
          forceDelete: false,
        },
      ]);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when passing object with invalid structure in dependents array", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users).addDependents([
        {
          name: "johny",
          age: 21,
        },
      ]);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should add string dependents successfully for entity", () => {
    let error = null;
    let result = null;
    const expectedConfigs = {
      comments: {
        name: "comments",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
      },
      users: {
        name: "users",
        identifierField: "key",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        dependents: [
          {
            entity: "comments",
            forceDelete: false,
          },
        ],
      },
    };
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        identifierField: "key",
      }).addDependents(["comments"]);

      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedConfigs);
  });

  it("should add object dependents successfully for entity", () => {
    let error = null;
    let result = null;
    const expectedConfigs = {
      comments: {
        name: "comments",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
      },
      users: {
        name: "users",
        identifierField: "key",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        dependents: [
          {
            entity: "comments",
            forceDelete: true,
          },
        ],
      },
    };
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        identifierField: "key",
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      }).addDependents([
        {
          entity: "comments",
          forceDelete: true,
        },
      ]);
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(result, expectedConfigs);
  });
});

describe("Endpoints Generator: Configuring Entity Routes", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error when configureRoutes is called without first calling configureEntity", () => {
    let error = null;
    try {
      EndpointsGenerator.configureRoutes("categories", {
        sample: "test",
      });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when config object has invalid key", () => {
    const sampleConfiguration = {
      person: {
        path: "/",
        middlewares: [],
        auth: authOptions.false,
      },
    };
    let error = null;
    try {
      EndpointsGenerator.configureEntity("categories").configureRoutes(
        sampleConfiguration
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when config object has invalid route path value", () => {
    const sampleConfiguration = {
      [ACTIONS.findMany]: {
        path: 1234,
        middlewares: [],
        auth: authOptions.false,
      },
    };
    let error = null;
    try {
      EndpointsGenerator.configureEntity("categories").configureRoutes(
        sampleConfiguration
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when config object has invalid route middlewares value", () => {
    const sampleConfiguration = {
      [ACTIONS.findMany]: {
        path: "/",
        middlewares: "John",
        auth: authOptions.false,
      },
    };
    let error = null;
    try {
      EndpointsGenerator.configureEntity("categories").configureRoutes(
        sampleConfiguration
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when config object has invalid route auth value", () => {
    const sampleConfiguration = {
      [ACTIONS.findMany]: {
        path: "/",
        middlewares: [],
        auth: true,
      },
    };
    let error = null;
    try {
      EndpointsGenerator.configureEntity("categories").configureRoutes(
        sampleConfiguration
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  // configureRoutesFor is optional. If not called it will auto generate for you
  it("should add entity DEFAULT configuration successfully when not providing config object", () => {
    let error = null;
    let result = null;
    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        routes: {
          ...DEFAULT_ROUTES_CONFIG,
        },
      },
    };
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      }).configureRoutes();
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(expected, result);
  });

  it("should add entity configuration successfully when supplied with a full config", () => {
    const sampleConfiguration = {
      [ACTIONS.findMany]: {
        path: "/",
        middlewares: [],
        auth: authOptions.false,
      },
      [ACTIONS.findById]: {
        path: "/:id",
        middlewares: [],
        auth: authOptions.false,
      },
      [ACTIONS.createOne]: {
        path: "/",
        middlewares: [],
        auth: authOptions.adminOnly,
      },
      [ACTIONS.updateOne]: {
        path: "/:id",
        middlewares: [],
        auth: authOptions.adminOnly,
      },
      [ACTIONS.deleteOne]: {
        path: "/:id",
        middlewares: [],
        auth: authOptions.adminOnly,
      },
    };
    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        routes: {
          ...sampleConfiguration,
        },
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      }).configureRoutes(sampleConfiguration);
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(expected, result);
  });

  it("should pad route configuration successfully when supplied with configs with partial definition", () => {
    const sampleConfiguration = {
      [ACTIONS.findMany]: {
        path: "/",
        auth: authOptions.false,
      },
      [ACTIONS.findById]: {
        path: "/:id",
        middlewares: [],
      },
      [ACTIONS.createOne]: {
        middlewares: [],
        auth: authOptions.adminOnly,
      },
      [ACTIONS.updateOne]: {},
      [ACTIONS.deleteOne]: false,
    };
    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        routes: {
          [ACTIONS.findMany]: {
            path: "/",
            middlewares: [],
            auth: authOptions.false,
          },
          [ACTIONS.findById]: {
            path: "/:id",
            middlewares: [],
            auth: authOptions.false,
          },
          [ACTIONS.createOne]: {
            path: "/",
            middlewares: [],
            auth: authOptions.adminOnly,
          },
          [ACTIONS.updateOne]: {
            path: "/:id",
            middlewares: [],
            auth: authOptions.adminOnly,
          },
          [ACTIONS.deleteOne]: false,
        },
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      }).configureRoutes(sampleConfiguration);
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(expected, result);
  });
});

describe("Endpoints Generator: Extending Entity Routes", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error when extendRoutesWith is called without first calling configureEntity", () => {
    let error = null;
    try {
      EndpointsGenerator.extendRoutesWith("get", "/", [], (req, res) => {
        return true;
      });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when extendRoutesWith is called with invalid method value", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity("users").extendRoutesWith(
        "Johny",
        "/",
        [],
        (req, res) => {
          return true;
        }
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when extendRoutesWith is called with invalid path value", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity("users").extendRoutesWith(
        "get",
        1234,
        [],
        (req, res) => {
          return true;
        }
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when extendRoutesWith is called with invalid middlewares value", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity("users").extendRoutesWith(
        "get",
        "/",
        [true, false],
        (req, res) => {
          return true;
        }
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when extendRoutesWith is called with invalid controllerCallback value", () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity("users").extendRoutesWith(
        "get",
        "/",
        [],
        "Johny"
      );
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should extend single route configuration successfully", () => {
    let error = null;
    let result = null;
    const controllerCbStub = sinon.stub();

    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
        extendedRoutes: [
          {
            method: "put",
            path: "/:id/test",
            middlewares: [],
            controllerCallback: controllerCbStub,
          },
        ],
      },
    };

    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      }).extendRoutesWith("put", "/:id/test", [], controllerCbStub);

      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(expected, result);
  });

  it("should extend multiple route configuration successfully with middlewares", () => {
    let error = null;
    let result = null;
    const controllerCbStub1 = sinon.stub();
    const controllerCbStub2 = sinon.stub();

    const middlewareStub1 = sinon.stub();
    const middlewareStub2 = sinon.stub();

    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
        extendedRoutes: [
          {
            method: "put",
            path: "/:id/test",
            middlewares: [],
            controllerCallback: controllerCbStub1,
          },
          {
            method: "post",
            path: "/:id",
            middlewares: [middlewareStub1, middlewareStub2],
            controllerCallback: controllerCbStub2,
          },
        ],
      },
    };

    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        createTokenCb: createTokenStub,
        isAdminCb: isAdminStub,
      })
        .extendRoutesWith("put", "/:id/test", [], controllerCbStub1)
        .extendRoutesWith(
          "post",
          "/:id",
          [middlewareStub1, middlewareStub2],
          controllerCbStub2
        );

      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(expected, result);
  });
});

describe("Endpoints Generator: Calling done after configuring an Entity", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("should throw error when done is called without first calling configureEntity", () => {
    let error = null;
    try {
      EndpointsGenerator.done();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should be successful when called after entity configuration", () => {
    let error = null;
    let result = null;
    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null,
        isAdminCb: null,
      },
    };

    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users).done();
      result = EndpointsGenerator.getEntityConfigurations();
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    assert.deepStrictEqual(expected, result);
  });
});

// configure Errorhandler and notFound Middlewares - put as options

// generate endpoints using default route configs
// generate endpoints using custom route configs
//  - custom path
//  - custom auth
//  - custom middlewares
//  - omit route action by marking false
// generate endpoints using custom route configs and 1 extended routes
// generate endpoints using custom route configs and 2 extended routes

describe("Endpoints Generator: Create App", () => {
  /**
   * create is async, but if run at top level may not need a preceeding 'await'
   */

  let appUseSpy;
  let appUseStub;
  let expressAppStub = null;

  beforeEach(() => {
    EndpointsGenerator._resetModule();
    appUseStub = sinon.stub();
    expressAppStub = {
      listen: sinon.stub(),
      use: appUseStub,
    };

    // appUseStub = sinon.stub(app, "use");
    // expressRouterSpy = sinon.spy(express, "Router");
    // routeSpy = sinon.spy(express.Router(), "route");
    // console.log(express.Router());
    // appUseSpy = sinon.spy(app, "use");
  });

  afterEach(() => {
    // app = null;
    // expressRouterSpy = null;
    // routeSpy = null;
    appUseSpy = null;
    expressAppStub = null;
  });

  it("should throw error when jwtSecret is missing and not using custom auth middlewares", async () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      await EndpointsGenerator.create(expressAppStub);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when invalid app parameter is passed", async () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      await EndpointsGenerator.create({ name: "john" }, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error if no primary entity is found", async () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error if more than one primary entity is found", async () => {
    let error = null;
    try {
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      });
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      });

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when create is called without first configuring entities", async () => {
    let error = null;
    try {
      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when using customDB but did not provided any DBModule", async () => {
    let error = null;
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      });

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when using customDB but only provided DBModules for some entities", async () => {
    let error = null;
    const usersDbModuleStub = sinon.stub();
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments);
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      }).addDBModule(usersDbModuleStub);

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should create app successfully when provided with custom errorHandler and notFoundHandler middlewares with Object DB Module", async () => {
    let error = null;

    const customErrorHandlerStub = sinon.stub();
    const customNotFoundStub = sinon.stub();

    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments).addDBModule(
        SampleObjectDbModuleStub
      );
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      }).addDBModule(SampleObjectDbModuleStub);

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret, {
        errorHandler: customErrorHandlerStub,
        notFoundHandler: customNotFoundStub,
      });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    sinon.assert.calledWith(appUseStub, customErrorHandlerStub);
    sinon.assert.calledWith(appUseStub, customNotFoundStub);
  });

  it("should create app successfully when configured with Function DB Module", async () => {
    let error = null;
    const dbModuleStub = sinon.stub();

    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments).addDBModule(
        SampleObjectDbModuleStub
      );
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      }).addDBModule(dbModuleStub);

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
  });

  it("should create app successfully when provided with initializeApplication callback", async () => {
    let error = null;

    const initializeAppStub = sinon.stub().returns({});
    try {
      EndpointsGenerator.useCustomDatabase().adaptClientDBInterface(
        VALID_DB_ADAPTATION
      );

      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.comments).addDBModule(
        SampleObjectDbModuleStub
      );
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.users, {
        isPrimaryEntity: true,
        isAdminCb: isAdminStub,
        createTokenCb: createTokenStub,
      }).addDBModule(SampleObjectDbModuleStub);

      await EndpointsGenerator.create(expressAppStub, sampleJwtSecret, {
        initializeAppCallback: initializeAppStub,
      });
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.equal(error, null);
    sinon.assert.callCount(initializeAppStub, 1);
  });

  // it("should call router.route with params [/], and appropriate function", () => {
  //   /* expect app to run:
  //    *
  //    * const router = express.router()
  //    *
  //    * const composedFunction = async function(req,res,next) => {
  //    * try {
  //    *      const categories = await DB.findAllFor(DB.getEntityConfigurations().categories);
  //    *      res.status(200).json(categories);
  //    * } catch (error) {
  //    *      res.status(400);
  //    *      next(new Error(error.message || error));
  //    *     }
  //    * }
  //    *
  //    * router.route(/).get(composedFunction)
  //    *
  //    *
  //    *  app.use(/api/categories, )
  //    */
  //   let error = null;
  //   try {
  //     EndpointsGenerator.generateEndpointsFor(app, "categories", {});
  //   } catch (e) {
  //     console.log(e);
  //     error = e;
  //   }
  //   assert.equal(error, null);
  //   // check if router was called only twice
  //   assert.equal(routerFake.callCount, 1);
  //   // check if route was called with correct paths
  //   assert.equal(expressRouterStub.route.calledWith("/"), true);
  //   // check if route was called with correct paths and method
  //   sinon.assert.calledWith(rootRoutesStub.get, sinon.match.func);
  //   sinon.assert.calledWith(rootRoutesStub.get, actionFunctionStub);
  //   // check if app.use was called exactly once
  //   assert.equal(appUseStub.callCount, 1);
  // });

  // it("should call router.route with params [/], with specified middlewares", () => {
  //   /* expect app to run:
  //    *
  //    * const router = express.router()
  //    *
  //    * const composedFunction = async function(req,res,next) => {
  //    * try {
  //    *      const categories = await DB.findAllFor(DB.getEntityConfigurations().categories);
  //    *      res.status(200).json(categories);
  //    * } catch (error) {
  //    *      res.status(400);
  //    *      next(new Error(error.message || error));
  //    *     }
  //    * }
  //    *
  //    * router.route(/).get(composedFunction)
  //    *
  //    *
  //    *  app.use(/api/categories, )
  //    */
  //   let error = null;
  //   try {
  //     EndpointsGenerator.generateEndpointsFor(app, "categories", {});
  //   } catch (e) {
  //     console.log(e);
  //     error = e;
  //   }
  //   assert.equal(error, null);
  //   // check if router was called only twice
  //   assert.equal(routerFake.callCount, 1);
  //   // check if route was called with correct paths
  //   assert.equal(expressRouterStub.route.calledWith("/"), true);
  //   // check if route was called with correct paths and method
  //   sinon.assert.calledWith(rootRoutesStub.get, sinon.match.func);
  //   sinon.assert.calledWith(rootRoutesStub.get, actionFunctionStub);
  //   // check if app.use was called exactly once
  //   assert.equal(appUseStub.callCount, 1);
  // });

  // test if a specific express route method is called
  //   it("should throw error when invalid app parameter is passed", () => {
  //     let error = null;
  //     try {
  //       EndpointsGenerator.prepareAppConstruction({ name: "john" });
  //     } catch (e) {
  //       error = e;
  //     }
  //     assert.throws(() => {
  //       EndpointsGenerator.prepareAppConstruction({ name: "john" });
  //     });
  //     assert.notEqual(error, null);
  //   });
});
