module.exports = async function () {
  if (global.WebDavInstance) {
    await global.WebDavInstance.stop();
  }
};
