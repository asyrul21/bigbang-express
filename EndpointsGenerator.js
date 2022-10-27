const express = require("express");
const morgan = require("morgan");
const ActionFunctionFactory = require("./ActionFunctionFactory");
const ACTIONS = require("./constants/ACTIONS");
const DEFAULT_ROUTES_CONFIG = require("./constants/DEFAULT_ROUTES_CONFIG");
const ROUTE_CONFIG_ENUMS = require("./constants/ROUTE_CONFIG_ENUMS");
const {
  objectHasMethod,
  booleanHasValue,
  stringHasValue,
  objectHasValue,
} = require("./utils");

const moduleFn = function () {
  /**
   * Describe something here
   */
  let useCustomDB = false;

  /**
   * Describe something here
   */
  let adaptedClientDBInterface = {};

  /**
   * Describe something
   */
  let entityConfigurations = {};

  /**
   * Describe something
   */
  let entityBeingConfigured = null;

  const parseEntityOptions = (options) => {
    const { identifierField, isPrimaryEntity, isAdminCallback } = options;
    const idField = stringHasValue(identifierField) ? identifierField : "id";
    const isPrimary = booleanHasValue(isPrimaryEntity)
      ? isPrimaryEntity
      : false;
    const isAdminCb =
      isAdminCallback && typeof isAdminCallback === "function"
        ? isAdminCallback
        : null;
    return { idField, isPrimary, isAdminCb };
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

  const validateMethodChainEntityForMethod = (methodName) => {
    if (!entityBeingConfigured || entityBeingConfigured === "") {
      throw new Error(
        `Chaining module's configuration method [${methodName}] require client to first call module method [configureEntity]`
      );
    }
  };

  const padRoutesConfigurationsWithDefaults = (config) => {
    let result = { ...config };
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

  return {
    _resetModule: function () {
      useCustomDB = false;
      adaptedClientDBInterface = {};
      entityConfigurations = {};
      // routeConfigurations = {};
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
    useCustomDatabase: function () {
      if (
        entityConfigurations &&
        Object.keys(entityConfigurations).length > 0
      ) {
        throw new Error(
          "Module method [useCustomDatabase] must only be called ONCE."
        );
      }
      useCustomDB = true;
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
      if (!useCustomDB) {
        throw new Error(
          "Module method [adaptClientDBInterface] should not be called if clients do not use a custom database."
        );
      }
      if (!dbApiMap || Object.keys(dbApiMap).length === 0) {
        throw new Error(
          "A valid object parameter is required by module method [adaptClientDBInterface]."
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
        isAdminCallback: null, // () => boolean
      }
    ) {
      if (!entity || entity === "") {
        throw new Error(
          "Argument parameter [entity] is required for module method [configureEntity]."
        );
      }
      if (useCustomDB) {
        if (!clientDbInterfaceIsAdapted()) {
          throw new Error(
            "Using custom DB requires the client to first adapt their interface by using module method [adaptClientDBInterface] before configuring entities."
          );
        }
      }
      if (
        (entityBeingConfigured && entityBeingConfigured === entity) ||
        entityConfigurations[entity]
      ) {
        throw new Error("Each entity can only be configured once.");
      }

      const { idField, isPrimary, isAdminCb } = parseEntityOptions(options);
      entityConfigurations = {
        ...entityConfigurations,
        [entity]: {
          name: entity,
          identifierField: idField,
          isPrimaryEntity: isPrimary,
          isAdminCallback: isAdminCb,
        },
      };
      entityBeingConfigured = entity;
      return this;
    },
    addDBModule: function (DBModule = null) {
      validateMethodChainEntityForMethod("addDBModule");
      if (useCustomDB) {
        if (!DBModule || typeof DBModule !== "function") {
          throw new Error(
            "Using custom DB requires the client to provide [DBModule] callback for each entity."
          );
        }
      }
      if (entityConfigurations[entityBeingConfigured].DBModule) {
        throw new Error(
          "Entities can only be configured with a DB module once."
        );
      }
      const defaultDBModule = null; // to be replaced with something else
      entityConfigurations = {
        ...entityConfigurations,
        [entityBeingConfigured]: {
          ...entityConfigurations[entityBeingConfigured],
          DBModule:
            DBModule && typeof DBModule === "function"
              ? DBModule
              : defaultDBModule,
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
     * This method is optional. If client does not provide, routes with be configures using default settings.
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
    extendRoutesWith: function (path, middlewares = [], controllerCallback) {
      validateMethodChainEntityForMethod("extendRoutesWith");
    },
    // prepareAppConstruction: function (
    //   app,
    //   options = {
    //     env: "dev",
    //     useCustomDatabase: false,
    //   }
    // ) {
    //   if (!objectHasMethod(app, "use") || !objectHasMethod(app, "listen")) {
    //     throw new Error(
    //       "Invalid parameter provided to module method [prepareApp]. Paramenter must be an instance of Express application."
    //     );
    //   }
    //   const { env, useCustomDatabase } = options;

    //   app.use(express.json());
    //   if (env === env ? env : "dev") {
    //     app.use(morgan("dev"));
    //   }
    //   if (useCustomDatabase) {
    //     useCustomDB = true;
    //   }
    //
    //
    // },
    // TODO: ERROR HANDLING MIDDLEWARES!!!
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
  };
};

module.exports = moduleFn();
