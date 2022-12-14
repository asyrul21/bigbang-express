const express = require("express");
const morgan = require("morgan");
const ActionFunctionFactory = require("./ActionFunctionFactory");
const ACTIONS = require("./constants/ACTIONS");
const DEFAULT_ROUTES_CONFIG = require("./constants/DEFAULT_ROUTES_CONFIG");
const ROUTE_CONFIG_ENUMS = require("./constants/ROUTE_CONFIG_ENUMS");
const {
  defaultErrorHandler,
  defaultNotFoundMiddleware,
} = require("./middlewares/errorHandlers");
const {
  objectHasMethod,
  booleanHasValue,
  stringHasValue,
  objectHasValue,
} = require("./utils");
// event emitter
const events = require("events");
const { authOptions } = require("./constants/ROUTE_CONFIG_ENUMS");
const EM = new events.EventEmitter();

const ROUTE_METHODS = ["get", "post", "put", "delete"];

const moduleFn = function () {
  /**
   * Describe something here
   */
  let useCustomAuth = false;

  /**
   * Describe something here
   */
  let adaptedClientDBInterface = {};

  /**
   * Holds all the required information to auto generate application's endpoints
   *
   * Eventual structure:
   *
   * {
   *   [entityName]: {
   *    name: "users",
   *    identifierField: "id", --> string
   *    isPrimaryEntity: true, --> boolean
   *    isAdminCb: null --> null or function, must be function id primaryEntity,
   *    createTokenCb: null, --> null or function, must be function if primaryEntity,
   *    DBModule: null, --> null or function
   *    routes: {
   *      [ACTIONS.findMany]: {
   *        path: "/",
   *        middlewares: [],
   *        auth: authOptions.false,
   *      },
   *      [ACTIONS.findById]: {
   *        path: "/:id",
   *        middlewares: [],
   *        auth: authOptions.false,
   *      },
   *      [ACTIONS.createOne]: {
   *        path: "/",
   *        middlewares: [],
   *        auth: authOptions.adminOnly,
   *      },
   *      [ACTIONS.updateOne]: {
   *        path: "/:id",
   *        middlewares: [],
   *        auth: authOptions.adminOnly,
   *      },
   *      [ACTIONS.deleteOne]: false,
   *    },
   *    extendedRoutes: [
   *      {
   *        method: "put",
   *        path: "/:id/test",
   *        middlewares: [],
   *        controllerCallback: controllerCbStub1,
   *      },
   *      {
   *        method: "post",
   *        path: "/:id",
   *        middlewares: [middlewareStub1, middlewareStub2],
   *        controllerCallback: controllerCbStub2,
   *      },
   *    ],
   *  },
   * }
   */
  let entityConfigurations = {};

  /**
   * Describe something
   */
  let entityBeingConfigured = null;

  /*
    Internal methods
  */
  const parseEntityOptions = (options) => {
    const { identifierField, isPrimaryEntity, createTokenCb, isAdminCb } =
      options;
    const idField = stringHasValue(identifierField) ? identifierField : "id";
    const isPrimary = booleanHasValue(isPrimaryEntity)
      ? isPrimaryEntity
      : false;
    const isAdminCallback =
      isAdminCb && typeof isAdminCb === "function" ? isAdminCb : null;
    const createTokenCallback =
      createTokenCb && typeof createTokenCb === "function"
        ? createTokenCb
        : null;
    return { idField, isPrimary, createTokenCallback, isAdminCallback };
  };

  const clientDbInterfaceIsAdapted = () => {
    if (
      !adaptedClientDBInterface ||
      Object.keys(adaptedClientDBInterface).length === 0
    ) {
      return false;
    }
    if (
      Object.keys(adaptedClientDBInterface).length !==
      Object.keys(ACTIONS).length
    ) {
      return false;
    }
    return true;
  };

  const arrayHasAllFunctions = (arr) => {
    let pass = true;
    arr.forEach((f) => {
      if (typeof f !== "function") {
        pass = false;
      }
    });
    return pass;
  };

  const validatePrimaryEntity = () => {
    const primaryEntityNames = Object.keys(entityConfigurations)
      .map((e) => {
        return {
          name: entityConfigurations[e].name,
          isPrimaryEntity: entityConfigurations[e].isPrimaryEntity,
        };
      })
      .filter((e) => e.isPrimaryEntity);
    if (primaryEntityNames.length === 0) {
      throw new Error(
        "No primary entity were found. Client must provide one and only one primary entity"
      );
    } else if (primaryEntityNames.length > 1) {
      throw new Error(
        "More than one primary entities were found. Client must provide one and only one primary entity"
      );
    }
  };

  const validateAllEntityDBModules = () => {
    let invalid = [];
    Object.keys(entityConfigurations).forEach((e) => {
      config = entityConfigurations[e];
      entityDbModule = config.DBModule;
      const isFunctionOrObject =
        typeof entityDbModule === "function" ||
        typeof entityDbModule === "object";
      if (!entityDbModule || !isFunctionOrObject) {
        invalid.push(e);
      }
    });
    if (invalid.length > 0) {
      throw new Error(
        `Clients must provide DBModules as function or object for all entities. Missing DBModule(s) found for entities [${invalid.toString()}]`
      );
    }
  };

  const getPrimaryEntity = () => {
    const primaryEntities = Object.keys(entityConfigurations)
      .map((e) => entityConfigurations[e])
      .filter((e) => e.isPrimaryEntity);
    return primaryEntities[0];
  };

  const validateMethodChainEntityForMethod = (methodName) => {
    if (!entityBeingConfigured || entityBeingConfigured === "") {
      throw new Error(
        `Chaining module's configuration method [${methodName}] require client to first call module method [configureEntity]`
      );
    }
  };

  const padRoutesConfigurationsWithDefaults = (config) => {
    let result = { ...config };
    // pad missing actions
    Object.keys(DEFAULT_ROUTES_CONFIG).forEach((action) => {
      if (!Object.keys(result).includes(action)) {
        const defaultActionConfig = DEFAULT_ROUTES_CONFIG[action];
        result = {
          ...result,
          [action]: {
            ...defaultActionConfig,
          },
        };
      }
    });

    // pad missing properties
    Object.keys(config).forEach((action) => {
      const routeActionConfig = config[action];
      // if action config is false, client is omitting the route path.
      // hence dont need configs for that
      if (routeActionConfig !== false) {
        const { path, middlewares, auth } = routeActionConfig;
        const defaultActionConfig = DEFAULT_ROUTES_CONFIG[action];
        // if undefined, client provided invalid action key
        if (objectHasValue(defaultActionConfig)) {
          const routePath = path ? path : defaultActionConfig.path;
          const routeMiddlewares = middlewares
            ? middlewares
            : defaultActionConfig.middlewares;
          const routeAuth = auth ? auth : defaultActionConfig.auth;

          result = {
            ...result,
            [action]: {
              path: routePath,
              middlewares: routeMiddlewares,
              auth: routeAuth,
            },
          };
        }
      }
    });
    return result;
  };

  const validateRoutesConfigurationStructure = (config) => {
    // validate invalid keys
    let invalid = [];
    Object.keys(config).forEach((a) => {
      if (!ACTIONS[a] && config[a] !== false) {
        invalid.push(a);
      }
    });
    if (invalid.length > 0) {
      throw new Error(
        `Provided route configuration key(s) [${invalid.toString()}] are invalid.`
      );
    }
    // validate each route's keys and structure
    invalid = [];
    Object.keys(config).forEach((a) => {
      if (config[a] !== false) {
        const { middlewares, auth, path } = config[a];
        // check path
        if (!path || path === "" || typeof path !== "string") {
          throw new Error(
            `Route configuration for entity [${entityBeingConfigured}] and action [${a}] has missing or invalid value for key [path]`
          );
        }
        // check middlewares
        if (!middlewares || typeof middlewares !== "object") {
          throw new Error(
            `Route configuration for entity [${entityBeingConfigured}] and action [${a}] has missing or invalid value for key [middlewares]`
          );
        }
        // check auth
        if (
          auth !== false &&
          !Object.keys(ROUTE_CONFIG_ENUMS.authOptions).includes(config[a].auth)
        ) {
          throw new Error(
            `Route configuration for entity [${entityBeingConfigured}] and action [${a}] has massing or invalid value for key [auth]`
          );
        }
      }
    });
  };

  const generateApplicationEndpoints = (app, secret, tokenPrefix) => {
    /**
     * Compose default Auth middlewares
     */
    let defaultReqLogin = null;
    let defaultMustBeAdmin = null;

    if (!useCustomAuth) {
      const primaryEntityConfigs = getPrimaryEntity();
      // console.log("primary entity:");
      // console.log(primaryEntityConfigs);
      const { DBModule, createTokenCb, isAdminCb } = primaryEntityConfigs;

      let entityFindSingle = null;
      if (typeof DBModule === "function") {
        entityFindSingle = DBModule;
      } else {
        // if object
        // get the method
        entityFindSingle = DBModule[adaptedClientDBInterface[ACTIONS.findById]]; // UserModel.findByid
      }

      defaultReqLogin = async (req, res, next) => {
        let token;
        if (
          req.headers.authorization &&
          req.headers.authorization.startsWith(tokenPrefix || "Bearer")
        ) {
          try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, secret);
            const current = await entityFindSingle(decoded.id); // execute the method here
            req[primaryEntityConfigs.name] = current;
            return next();
          } catch (error) {
            console.error(error);
            res.status(401);
            next(
              new Error(
                "Not authorized, token failed. " + (error.message || error)
              )
            );
          }
        }
        if (!token) {
          res.status(401);
          next(new Error("Not authorized"));
        }
      };

      defaultMustBeAdmin = async (req, res, next) => {
        const current = req[primaryEntityConfigs.name];
        if (current && isAdminCb(current)) {
          next();
        } else {
          res.status(401);
          next(new Error("Not authorized as an admin"));
        }
      };
    }

    /**
     * Populate routes
     */
    Object.keys(entityConfigurations).forEach((entity) => {
      const entityConfig = entityConfigurations[entity];
      const {
        name,
        identifierField,
        isPrimaryEntity,
        createTokenCb,
        DBModule,
        extendedRoutes,
        routes: routesConfig,
      } = entityConfig;

      const entityRouter = express.Router();
      const routesConfigurations =
        routesConfig && Object.keys(routesConfig).length > 0
          ? routesConfig
          : { ...DEFAULT_ROUTES_CONFIG };

      Object.keys(routesConfigurations).forEach((action) => {
        const actionConfig = routesConfigurations[action];
        if (actionConfig !== false) {
          const { path, middlewares, auth } = actionConfig;

          switch (action) {
            case [ACTIONS.findMany]:
              const entityFindMany =
                typeof DBModule === "function"
                  ? DBModule
                  : DBModule[adaptedClientDBInterface[ACTIONS.findMany]];
              // 1. create function
              const entityFindAllController = async (req, res, next) => {
                try {
                  const data = await entityFindMany();
                  res.status(200).json(data);
                } catch (error) {
                  res.status(400);
                  next(new Error(`Action ${action} on entity ${name} failed.`));
                }
              };
              // 2. compose middlewares
              let controllerMiddlewares = [];
              if (
                useCustomAuth ||
                auth === authOptions.middlewares ||
                auth === authOptions.false
              ) {
                controllerMiddlewares = [...middlewares];
              } else {
                if (auth === authOptions.protected) {
                  controllerMiddlewares = [defaultReqLogin, ...middlewares];
                } else if (auth === authOptions.adminOnly) {
                  controllerMiddlewares = [
                    defaultReqLogin,
                    defaultMustBeAdmin,
                    ...middlewares,
                  ];
                }
              }
              // 3. compose route
              router
                .route(path)
                .get(...controllerMiddlewares, entityFindAllController);
              break;
            case [ACTIONS.findById]:
              // something
              break;
            case [ACTIONS.createOne]:
              // something
              break;
            case [ACTIONS.updateOne]:
              // something
              break;
            case [ACTIONS.deleteOne]:
              // something
              break;
            default:
              break;
          }
        }
      });
      app.use(`/api/${name}`, entityRouter);
    });
  };

  return {
    _resetModule: function () {
      useCustomAuth = false;
      adaptedClientDBInterface = {};
      entityConfigurations = {};
      entityBeingConfigured = null;
    },
    _resetEntityConfigurations: function () {
      entityConfigurations = {};
    },
    getCurrentlyConfiguringEntity: function () {
      return entityBeingConfigured;
    },
    getDBInterface: function () {
      return adaptedClientDBInterface;
    },
    getEntityConfigurations: function () {
      return entityConfigurations;
    },
    getEntityNames: function () {
      let result = {};
      if (
        entityConfigurations &&
        Object.keys(entityConfigurations).length > 0
      ) {
        result = Object.keys(entityConfigurations).reduce((acc, curr) => {
          return {
            ...acc,
            [curr]: entityConfigurations[curr].name,
          };
        }, {});
      }
      return result;
    },
    useCustomAuthMiddlewares: function () {
      if (
        useCustomAuth ||
        (entityConfigurations && Object.keys(entityConfigurations).length > 0)
      ) {
        throw new Error(
          "Module method [useCustomAuthMiddlewares] must only be called ONCE before entity configurations"
        );
      }
      useCustomAuth = true;
    },
    /**
     *
     * @param {Object} dbApiMap : an object with module actions as keys, and correspoing client database's api method name.
     *
     * eg: {
     *  [ACTIONS.findMany]: "find",
     *  [ACTIONS.findById]: "findById",
     *  [ACTIONS.createOne]: "createNewFor",
     *  [ACTIONS.updateOne]: "updateFor",
     *  [ACTIONS.deleteOne]: "deleteFor",
     *  [ACTIONS.save]: "save" or false if not implemented,
     * }
     */
    adaptClientDBInterface: function (dbApiMap) {
      if (!dbApiMap || Object.keys(dbApiMap).length === 0) {
        throw new Error(
          "A valid object parameter is required by module method [adaptClientDBInterface]"
        );
      }
      let result = {};
      let missingOrInvalid = [];
      Object.keys(ACTIONS).forEach((item) => {
        if (typeof dbApiMap[item] === "boolean" && dbApiMap[item] === false) {
          result[item] = dbApiMap[item];
        } else if (dbApiMap[item] && typeof dbApiMap[item] === "string") {
          result[item] = dbApiMap[item];
        } else {
          missingOrInvalid.push(item);
        }
      });
      if (missingOrInvalid.length > 0) {
        throw new Error(
          `DB module adaptation failed. Adaptation for action(s) [ ${missingOrInvalid.toString()} ] are either missing or has invalid value.`
        );
      } else {
        adaptedClientDBInterface = { ...result };
      }
    },
    configureEntity: function (
      entity,
      options = {
        identifierField: "id",
        isPrimaryEntity: false,
        createTokenCb: null, // (entityObject) => void
        isAdminCb: null, // (entityObject) => boolean
      }
    ) {
      if (!entity || entity === "") {
        throw new Error(
          "Argument parameter [entity] is required for module method [configureEntity]"
        );
      }
      if (!clientDbInterfaceIsAdapted()) {
        throw new Error(
          "Module method [configureEntity] must be called AFTER client has adapted their DB interface using module method [adaptClientDBInterface]"
        );
      }
      if (
        (entityBeingConfigured && entityBeingConfigured === entity) ||
        entityConfigurations[entity]
      ) {
        throw new Error("Each entity can only be configured once");
      }

      const { idField, isPrimary, createTokenCallback, isAdminCallback } =
        parseEntityOptions(options);

      if (isPrimary && !createTokenCallback) {
        throw new Error(
          "Primary entity must provide options of key [createTokenCb] function in module method [configureEntity]"
        );
      }
      if (isPrimary && !isAdminCallback) {
        throw new Error(
          "Primary entity must provide options of key [isAdminCb] function in module method [configureEntity]"
        );
      }

      entityConfigurations = {
        ...entityConfigurations,
        [entity]: {
          name: entity,
          identifierField: idField,
          isPrimaryEntity: isPrimary,
          createTokenCb: createTokenCallback,
          isAdminCb: isAdminCallback,
        },
      };
      entityBeingConfigured = entity;
      return this;
    },
    done: function () {
      if (!entityBeingConfigured) {
        throw new Error(
          "Module's chain method [done] must be called after entity configuration"
        );
      }
      entityBeingConfigured = null;
    },
    /*
      Clients can pass and object: bbx.configureEntity("users").addDBModule(UserModel)

      or

      Clients can pass as function like this: bbx.configureEntity("users").addDBModule((...params) => {
        // might need to find a way to generalize this line below
        // or make a wrapper with adapted interface
        return JsonCryptDB.FindAllFor("users", ...params)
      })
    */
    /**
     *
     * @param {Function or Object} DBModule - Module called by third party database based on entity or model
     * @returns void
     */
    addDBModule: function (DBModule = null) {
      validateMethodChainEntityForMethod("addDBModule");
      if (
        !adaptedClientDBInterface ||
        Object.keys(adaptedClientDBInterface).length === 0
      ) {
        throw new Error(
          "Module method [addDBModule] requires client to first adapt their DB interface using module method [adaptClientDBInterface]"
        );
      }
      const isFunctionOrObject =
        typeof DBModule === "function" || typeof DBModule === "object";

      if (!DBModule || !isFunctionOrObject) {
        throw new Error(
          "Module method [addDBModule] requires argument [DBModule] of type function or object"
        );
      }
      if (entityConfigurations[entityBeingConfigured].DBModule) {
        throw new Error(
          "Entities can only be configured with a DB module once"
        );
      }
      const defaultDBModule = null; // to be replaced with something else
      entityConfigurations = {
        ...entityConfigurations,
        [entityBeingConfigured]: {
          ...entityConfigurations[entityBeingConfigured],
          DBModule: DBModule && isFunctionOrObject ? DBModule : defaultDBModule,
        },
      };
      return this;
    },
    addDependents: function (dependents = []) {
      validateMethodChainEntityForMethod("addDependents");
      let deps = [];
      dependents.forEach((d) => {
        if (typeof d === "string") {
          if (!Object.keys(entityConfigurations).includes(d)) {
            throw new Error(
              "Invalid or unknown entity dependent(s) provided in dependents array for module method [addDependents]"
            );
          }
          deps.push({
            entity: d,
            forceDelete: false,
          });
        } else if (typeof d === "object") {
          if (
            !Object.keys(d).includes("entity") ||
            !Object.keys(d).includes("forceDelete")
          ) {
            throw new Error(
              "Invalid dependent object structure(s) found in dependents array for module method [addDependents]"
            );
          }
          if (!Object.keys(entityConfigurations).includes(d.entity)) {
            throw new Error(
              "Invalid or unknown entity(s) dependents provided in dependents array for module method [addDependents]"
            );
          }
          deps.push({
            entity: d.entity,
            forceDelete: d.forceDelete,
          });
        } else {
          throw new Error(
            "Invalid data type provided as dependents array for module method [addDependents]"
          );
        }
      });
      entityConfigurations = {
        ...entityConfigurations,
        [entityBeingConfigured]: {
          ...entityConfigurations[entityBeingConfigured],
          dependents: [...deps],
        },
      };
      return this;
    },
    /**
     *
     * @param {Object} routesConfig - specific route configurations based on ACTIONS. Mark false to omit route, or omit the action key to use default implementation
     * @returns void
     *
     * This method is optional. If client does not provide, routes will be configured using default settings.
     */

    configureRoutes: function (routesConfig = {}) {
      validateMethodChainEntityForMethod("configureRoutes");
      let routesConfigResult;
      if (!routesConfig || Object.keys(routesConfig).length === 0) {
        routesConfigResult = { ...DEFAULT_ROUTES_CONFIG };
      } else {
        routesConfigResult = padRoutesConfigurationsWithDefaults(routesConfig);
        validateRoutesConfigurationStructure(routesConfigResult);
      }
      entityConfigurations = {
        ...entityConfigurations,
        [entityBeingConfigured]: {
          ...entityConfigurations[entityBeingConfigured],
          routes: { ...routesConfigResult },
        },
      };
      return this;
    },
    /**
     *
     * @param {string} method - "get" || "post" || "put" || "delete"
     * @param {string} path - route path. eg. /export/json
     * @param {Object} middlewares - array of middleware functions
     * @param {Function} controllerCallback - controller function
     */
    extendRoutesWith: function (
      method,
      path,
      middlewares = [],
      controllerCallback
    ) {
      validateMethodChainEntityForMethod("extendRoutesWith");
      if (!method || !ROUTE_METHODS.includes(method)) {
        throw new Error(
          `Invalid value provided for argument [method] of module method [extendRoutesWith]`
        );
      }
      if (!path || typeof path !== "string") {
        throw new Error(
          `Invalid value provided for argument [path] of module method [extendRoutesWith]`
        );
      }
      if (!middlewares || !arrayHasAllFunctions(middlewares)) {
        throw new Error(
          `Invalid array item value(s) provided for argument [middlewares] of module method [extendRoutesWith]`
        );
      }
      if (!controllerCallback || typeof controllerCallback !== "function") {
        throw new Error(
          `Invalid value provided for argument [controllerCallback] of module method [extendRoutesWith]`
        );
      }
      const newRouteExtension = {
        method,
        path,
        middlewares,
        controllerCallback,
      };

      entityConfigurations = {
        ...entityConfigurations,
        [entityBeingConfigured]: {
          ...entityConfigurations[entityBeingConfigured],
          extendedRoutes:
            entityConfigurations[entityBeingConfigured].extendedRoutes &&
            entityConfigurations[entityBeingConfigured].extendedRoutes.length >
              0
              ? [
                  ...entityConfigurations[entityBeingConfigured].extendedRoutes,
                  newRouteExtension,
                ]
              : [newRouteExtension],
        },
      };
      return this;
    },
    generateEndpointsFor: function (app, entity, overrides = {}) {
      // add routes, if not in routeConfigs, use default configs

      const router = express.Router();

      const getAction = ActionFunctionFactory.getFunctionForAction(
        ACTIONS.findMany
      );
      router.route("/").get(getAction);

      // last part
      app.use(`/api/${entity}`, router);
    },
    helloWorld: function () {
      console.log("Hello world!");
    },

    create: async function (
      app,
      jwtSecret,
      middlewareOverrides = {
        errorHandler: null,
        notFoundHandler: null,
        env: "dev",
        initializeAppCallback: async function (env, em) {},
        tokenHandle: "Bearer",
      }
    ) {
      entityBeingConfigured = null;
      if (
        !entityConfigurations ||
        Object.keys(entityConfigurations).length === 0
      ) {
        throw new Error(
          "Clients must first configure app entities using module method [configureEntity] before calling module method [create]"
        );
      }
      /**
       * Validations
       */
      if (!objectHasMethod(app, "use") || !objectHasMethod(app, "listen")) {
        throw new Error(
          "Invalid parameter provided to module method [create]. Parameter must be an instance of Express module"
        );
      }
      if (!useCustomAuth && (!jwtSecret || typeof jwtSecret !== "string")) {
        throw new Error(
          "Argument parameter [jwtSecret] is required for module method [create] if client intends to use default auth implementations"
        );
      }
      validatePrimaryEntity();
      validateAllEntityDBModules();
      /**
       * Param processing
       */
      const {
        errorHandler,
        notFoundHandler,
        env,
        initializeAppCallback,
        tokenHandle,
      } = middlewareOverrides;
      const environment = env && typeof env === "string" ? env : "dev";
      const initializeApplication =
        initializeAppCallback && typeof initializeAppCallback === "function"
          ? initializeAppCallback
          : async function (env, em) {};
      const tokenPrefix =
        tokenHandle && typeof tokenHandle === "string" ? tokenHandle : "Bearer";
      /**
       * Middleware setup
       */
      const errorHandlerMiddleware =
        errorHandler && typeof errorHandler === "function"
          ? errorHandler
          : defaultErrorHandler;
      const notFoundMiddleware =
        notFoundHandler && typeof notFoundHandler === "function"
          ? notFoundHandler
          : defaultNotFoundMiddleware;

      /**
       * App creation
       */
      app.use(express.json());
      if (environment === "dev") {
        app.use(morgan("dev"));
      }
      await initializeApplication(environment, EM);

      /**
       * Routes generation: Where the magic happens
       */
      // bla bla
      generateApplicationEndpoints(app, jwtSecret, tokenPrefix);

      /**
       * Error middlewares
       */
      app.use(notFoundMiddleware);
      app.use(errorHandlerMiddleware);

      return EM;
    },
  };
};

module.exports = moduleFn();
