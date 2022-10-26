const assert = require("assert");
const sinon = require("sinon");
const ACTIONS = require("../constants/ACTIONS");
const express = require("express");
const EndpointsGenerator = require("../EndpointsGenerator");
const ActionFunctionFactory = require("../ActionFunctionFactory");
const { authOptions } = require("../constants/ROUTE_CONFIG_ENUMS");

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

const mockReq = { req: "requestObject" };
const mockRes = { res: "responseObject" };
function mockNext() {}

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

const mockExpressAppObject = {
  listen: function () {
    console.log("mock app listen function");
  },
  use: function (sampleParam) {
    const sample = "Just for fun";
  },
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
      EndpointsGenerator.useCustomDatabase();
      EndpointsGenerator.adaptClientDBInterface(thirdPartyDatabase);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  it("should throw error when called again after configuring entity", () => {
    let error = null;
    try {
      EndpointsGenerator.useCustomDatabase();
      EndpointsGenerator.adaptClientDBInterface(VALID_DB_ADAPTATION);

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
      EndpointsGenerator.useCustomDatabase();
      EndpointsGenerator.adaptClientDBInterface(VALID_DB_ADAPTATION);
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
      EndpointsGenerator.useCustomDatabase();
      EndpointsGenerator.adaptClientDBInterface(thirdPartyDatabase);
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
      EndpointsGenerator.useCustomDatabase();
      EndpointsGenerator.adaptClientDBInterface(thirdPartyDatabase);
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
      EndpointsGenerator.useCustomDatabase();
      EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
    } catch (e) {
      console.log(e);
      error = e;
    }
    assert.notEqual(error, null);
  });

  // it("should throw error when using custom database but did not provide DBModule callback", () => {
  //   let error = null;
  //   try {
  //     EndpointsGenerator.useCustomDatabase();
  //     EndpointsGenerator.adaptClientDBInterface(VALID_DB_ADAPTATION);
  //     EndpointsGenerator.configureEntity(SAMPLE_ENTITIES.categories);
  //   } catch (e) {
  //     console.log(e);
  //     error = e;
  //   }
  //   assert.notEqual(error, null);
  // });

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

  it("should configure single entity successfully without options", () => {
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        isAdminCallback: null,
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
    const adminCbStub = sinon.stub();
    const expectedEntityConfiguration = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        isAdminCallback: adminCbStub,
      },
    };
    let error = null;
    let result = null;
    try {
      EndpointsGenerator.configureEntity("users", {
        isPrimaryEntity: true,
        isAdminCallback: adminCbStub,
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
        isAdminCallback: null,
      },
      comments: {
        name: "comments",
        identifierField: "id",
        isPrimaryEntity: false,
        isAdminCallback: null,
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

  // it("should configure multiple entities when using custom database successfully", () => {
  //   const cateogoriesModuleStub = sinon.stub();
  //   const commentModulesStub = sinon.stub();
  //   const expectedEntityConfiguration = {
  //     categories: {
  //       name: "categories",
  //       DBModule: cateogoriesModuleStub,
  //     },
  //     comments: {
  //       name: "comments",
  //       DBModule: commentModulesStub,
  //     },
  //   };
  //   let error = null;
  //   let result = null;
  //   try {
  //     EndpointsGenerator.useCustomDatabase();
  //     EndpointsGenerator.adaptClientDBInterface(VALID_DB_ADAPTATION);

  //     EndpointsGenerator.configureEntity(
  //       SAMPLE_ENTITIES.categories,
  //       cateogoriesModuleStub
  //     );
  //     EndpointsGenerator.configureEntity(
  //       SAMPLE_ENTITIES.comments,
  //       commentModulesStub
  //     );

  //     result = EndpointsGenerator.getEntityConfigurations();
  //   } catch (e) {
  //     error = e;
  //   }
  //   assert.equal(error, null);
  //   assert.deepStrictEqual(result, expectedEntityConfiguration);
  // });
});

describe("Endpoints Generator: Configuring Entity DB Modules with method chaining", () => {
  beforeEach(() => {
    EndpointsGenerator._resetModule();
  });

  it("Should add appropriate DB Module to a single entity callback successfully", () => {
    const entityModuleStub = sinon.stub();
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        isAdminCallback: null,
        DBModule: entityModuleStub,
      },
    };
    let error = null;
    let result = null;
    try {
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

  it("Should add appropriate DB Modules callbacks to a multiple entities successfully", () => {
    const cateogoriesModuleStub = sinon.stub();
    const commentModulesStub = sinon.stub();
    const expectedEntityConfiguration = {
      categories: {
        name: "categories",
        identifierField: "id",
        isPrimaryEntity: false,
        isAdminCallback: null,
        DBModule: cateogoriesModuleStub,
      },
      comments: {
        name: "comments",
        identifierField: "id",
        isPrimaryEntity: false,
        isAdminCallback: null,
        DBModule: commentModulesStub,
      },
    };
    let error = null;
    let result = null;
    try {
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
        isAdminCallback: null,
      },
      users: {
        name: "users",
        identifierField: "key",
        isPrimaryEntity: true,
        isAdminCallback: null,
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
        isAdminCallback: null,
      },
      users: {
        name: "users",
        identifierField: "key",
        isPrimaryEntity: true,
        isAdminCallback: null,
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

  // configureRoutesFor is optional. If not called it will auto generate for you
  it("should add entity configuration successfully when supplied with a full config", () => {
    const sampleConfiguration = {
      [ACTIONS.findMany]: {
        middlewares: [],
        auth: authOptions.false,
      },
      [ACTIONS.findById]: {
        middlewares: [],
        auth: authOptions.false,
      },
      [ACTIONS.createOne]: {
        middlewares: [],
        auth: authOptions.adminOnly,
      },
      [ACTIONS.updateOne]: {
        middlewares: [],
        auth: authOptions.adminOnly,
      },
      [ACTIONS.deleteOne]: {
        middlewares: [],
        auth: authOptions.adminOnly,
      },
    };
    const expected = {
      users: {
        name: "users",
        identifierField: "id",
        isPrimaryEntity: true,
        isAdminCallback: null,
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

// describe("Endpoints Generator: App Preparation", () => {
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

//   it("should call app's [use] method 2 times", () => {
//     const appUseSpy = sinon.spy(mockExpressAppObject, "use");
//     let error = null;
//     try {
//       EndpointsGenerator.prepareAppConstruction(mockExpressAppObject);
//     } catch (e) {
//       error = e;
//     }
//     const calledTimes = appUseSpy.callCount;
//     assert.equal(calledTimes, 2);
//     assert.equal(error, null);
//   });
// });

// describe("Endpoints Generator: Routes Generation", () => {
//   let app;
//   let expressRouterSpy;
//   let routeSpy;
//   let appUseSpy;
//   let appUseStub;

//   beforeEach(() => {
//     app = express();
//     appUseStub = sinon.stub(app, "use");
//     // expressRouterSpy = sinon.spy(express, "Router");
//     // routeSpy = sinon.spy(express.Router(), "route");
//     // console.log(express.Router());
//     // appUseSpy = sinon.spy(app, "use");
//   });

//   // afterEach(() => {
//   //   app = null;
//   //   expressRouterSpy = null;
//   //   routeSpy = null;
//   //   appUseSpy = null;
//   // });

//   it("should call router.route with params [/], and appropriate function", () => {
//     /* expect app to run:
//      *
//      * const router = express.router()
//      *
//      * const composedFunction = async function(req,res,next) => {
//      * try {
//      *      const categories = await DB.findAllFor(DB.getEntityConfigurations().categories);
//      *      res.status(200).json(categories);
//      * } catch (error) {
//      *      res.status(400);
//      *      next(new Error(error.message || error));
//      *     }
//      * }
//      *
//      * router.route(/).get(composedFunction)
//      *
//      *
//      *  app.use(/api/categories, )
//      */
//     let error = null;
//     try {
//       EndpointsGenerator.generateEndpointsFor(app, "categories", {});
//     } catch (e) {
//       console.log(e);
//       error = e;
//     }
//     assert.equal(error, null);
//     // check if router was called only twice
//     assert.equal(routerFake.callCount, 1);
//     // check if route was called with correct paths
//     assert.equal(expressRouterStub.route.calledWith("/"), true);
//     // check if route was called with correct paths and method
//     sinon.assert.calledWith(rootRoutesStub.get, sinon.match.func);
//     sinon.assert.calledWith(rootRoutesStub.get, actionFunctionStub);
//     // check if app.use was called exactly once
//     assert.equal(appUseStub.callCount, 1);
//   });

//   // it("should call router.route with params [/], with specified middlewares", () => {
//   //   /* expect app to run:
//   //    *
//   //    * const router = express.router()
//   //    *
//   //    * const composedFunction = async function(req,res,next) => {
//   //    * try {
//   //    *      const categories = await DB.findAllFor(DB.getEntityConfigurations().categories);
//   //    *      res.status(200).json(categories);
//   //    * } catch (error) {
//   //    *      res.status(400);
//   //    *      next(new Error(error.message || error));
//   //    *     }
//   //    * }
//   //    *
//   //    * router.route(/).get(composedFunction)
//   //    *
//   //    *
//   //    *  app.use(/api/categories, )
//   //    */
//   //   let error = null;
//   //   try {
//   //     EndpointsGenerator.generateEndpointsFor(app, "categories", {});
//   //   } catch (e) {
//   //     console.log(e);
//   //     error = e;
//   //   }
//   //   assert.equal(error, null);
//   //   // check if router was called only twice
//   //   assert.equal(routerFake.callCount, 1);
//   //   // check if route was called with correct paths
//   //   assert.equal(expressRouterStub.route.calledWith("/"), true);
//   //   // check if route was called with correct paths and method
//   //   sinon.assert.calledWith(rootRoutesStub.get, sinon.match.func);
//   //   sinon.assert.calledWith(rootRoutesStub.get, actionFunctionStub);
//   //   // check if app.use was called exactly once
//   //   assert.equal(appUseStub.callCount, 1);
//   // });

//   // test if a specific express route method is called
//   //   it("should throw error when invalid app parameter is passed", () => {
//   //     let error = null;
//   //     try {
//   //       EndpointsGenerator.prepareAppConstruction({ name: "john" });
//   //     } catch (e) {
//   //       error = e;
//   //     }
//   //     assert.throws(() => {
//   //       EndpointsGenerator.prepareAppConstruction({ name: "john" });
//   //     });
//   //     assert.notEqual(error, null);
//   //   });
// });
