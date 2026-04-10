function initUploadState() {
  return {
    uploadId: "",
    route: "transporter",
    status: "idle",
    logs: [],
    startedAt: null,
    finishedAt: null,
    artifactUrl: ""
  };
}

function prepareUpload(project) {
  const build = project.buildState || {};
  const apple = project.appleState || {};

  if (!build.ipaReady) {
    throw new Error("IPA not ready");
  }

  if (!apple.appExists || !apple.versionReady) {
    throw new Error("Apple app/version not ready");
  }

  return {
    ok: true,
    artifactUrl: build.artifactUrl,
    route: project.uploadState?.route || "transporter"
  };
}

module.exports = {
  initUploadState,
  prepareUpload
};
