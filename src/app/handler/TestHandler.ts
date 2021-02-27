import {Route} from '@sora-soft/framework';

class TestHandler extends Route {
  @Route.method
  async test(body: void) {
    return {
      test: true
    };
  }
}

export {TestHandler};
