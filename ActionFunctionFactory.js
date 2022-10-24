const ACTIONS = require("./constants/ACTIONS");

module.exports = (function () {
  const generateMethodForAction = (action) => {
    if (!ACTIONS[action]) {
      throw new Error("Invalid action provided for function generation");
    }
    if (action === ACTIONS.findMany) {
      return async (req, res, next) => {
        // some GET processing here
      };
    }
    return null;
  };

  return {
    getFunctionForAction: function (action) {
      return generateMethodForAction(action);
    },
  };
})();
