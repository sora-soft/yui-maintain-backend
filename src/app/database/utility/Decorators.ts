import {DatabaseComponent} from '@sora-soft/database-component';
import {EntityManager} from '@sora-soft/database-component/typeorm';

export const transaction = (component: DatabaseComponent) => {
  return (target: Object, key: string, descriptor: PropertyDescriptor) => {
    const origin = descriptor.value as Function;
    const types = Reflect.getMetadata('design:paramtypes', target, key) as unknown[];
    const idx = types.indexOf(EntityManager);
    if (idx < 0)
      throw new TypeError('Cannot find EntityManager parameter');

    descriptor.value = async function (...args: unknown[]) {
      const inputManager: EntityManager = args[idx] as EntityManager || component.manager;
      if (!inputManager.queryRunner || !inputManager.queryRunner.isTransactionActive) {
        args[idx] = await new Promise<EntityManager>((resolve, reject) => {
          inputManager.transaction(async (manager) => {
            resolve(manager);
          }).catch(reject);
        });
      }
      return origin.apply(this, args) as unknown;
    };
  };
};
