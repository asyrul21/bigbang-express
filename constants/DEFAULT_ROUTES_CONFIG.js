const ACTIONS = require("./ACTIONS");
const { authOptions } = require("./ROUTE_CONFIG_ENUMS");

// products
module.exports = {
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
