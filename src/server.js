const express = require('express');
const path = require('path');
const config = require('./config');
const scheduler = require('./scheduler');

const healthRoute = require('./routes/health');
const allRoute = require('./routes/all');
const historyRoute = require('./routes/history');
const sourceHealthRoute = require('./routes/source-health');
const decisionRoute = require('./routes/decision');

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/health', healthRoute);
app.use('/api/all', allRoute);
app.use('/api/history', historyRoute);
app.use('/api/source-health', sourceHealthRoute);
app.use('/api/decision', decisionRoute);

const PORT = config.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Weather Aggregator listening on port ${PORT}`);
  
  // Only start scheduler if enabled (for local/traditional hosting)
  // On Vercel/serverless, set ENABLE_SCHEDULER=false
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    scheduler.start();
  } else {
    console.log('Scheduler disabled (serverless mode)');
  }
});
