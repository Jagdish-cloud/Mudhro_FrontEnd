module.exports = {
  apps: [
    {
      name: "root",
      script: "npx",
      args: "serve /home/site/wwwroot/dist -p 80 -s",
      instances: 1,
      exec_mode: "fork"
    },
    {
      name: "client-portal",
      script: "npx",
      args: "serve /home/site/wwwroot/client-portal/dist -p 81 -s",
      instances: 1,
      exec_mode: "fork"
    }
  ]
};