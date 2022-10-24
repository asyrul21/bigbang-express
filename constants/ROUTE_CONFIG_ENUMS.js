module.exports = {
  authOptions: {
    false: false, // route is public
    adminOnly: "adminOnly", // only admin can access,
    protected: "protected", // only for logged in user & admin
    middlewares: "middlewares",
  },
};
