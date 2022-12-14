const stringHasValue = (str) => {
  return str && str !== null && str !== undefined && str !== "";
};

const arrayHasValue = (arr) => {
  return arr && arr.length > 0;
};

const booleanHasValue = (val) => {
  return val === true || val === false;
};

const objectHasValue = (obj) => {
  return obj !== null && obj !== undefined && Object.keys(obj).length > 0;
};

const objectHasMethod = (obj, methodName) => {
  return obj[methodName] && typeof obj[methodName] === "function";
};

module.exports = {
  stringHasValue,
  arrayHasValue,
  booleanHasValue,
  objectHasMethod,
  objectHasValue,
};
