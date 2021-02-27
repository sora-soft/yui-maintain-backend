import 'source-map-support/register';
import {Application, IApplicationOptions} from './app/Application';

export async function main(options: IApplicationOptions) {
  await Application.start(options);
}
