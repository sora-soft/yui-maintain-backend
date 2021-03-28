import {Route} from '@sora-soft/framework';
import {ValidateClass, AssertType} from 'typescript-is';

export interface IReqRestfulFetch {}

@ValidateClass()
class AuthHandler extends Route {
  // @Route.method
  // async fetchAccountList(body: ) {}
}


export {AuthHandler}
