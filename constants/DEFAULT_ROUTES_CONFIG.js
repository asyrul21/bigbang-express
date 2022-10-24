const ACTIONS = require("./ACTIONS");
const { authOptions } = require("./ROUTE_CONFIG_ENUMS");

// products
module.exports = {
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
