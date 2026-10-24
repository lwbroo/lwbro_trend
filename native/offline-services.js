/* Native offline release adapter. Future web service implementations stay in js/. */
const AiReading = Object.freeze({
  configured: () => false,
  peekCache: () => null,
  reportError: () => {},
  getClientId: () => { throw new Error('此版本只提供離線功能'); },
  getReading: async () => { throw new Error('此版本只提供離線功能'); }
});
const Chat = Object.freeze({
  configured: () => false,
  send: async () => { throw new Error('此版本只提供離線功能'); }
});
const Sync = (() => {
  const unavailable = async () => { throw new Error('此版本只提供離線功能'); };
  return Object.freeze({
    config: () => null, isConnected: () => false, oauthConfigured: () => false,
    onStatus: () => {}, schedulePush: () => {}, adoptFromUrl: () => false,
    handleOAuthCallback: async () => false, makeLink: () => null,
    connect: unavailable, syncNow: unavailable, pull: unavailable, push: unavailable,
    loginWithGitHub: () => { throw new Error('此版本只提供離線功能'); },
    disconnect: () => {}
  });
})();
