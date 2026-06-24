import { env } from './config/env';
import app from './app';

app.listen(env.PORT, () => {
  console.log(`HelpHub API running on port ${env.PORT}`);
});
