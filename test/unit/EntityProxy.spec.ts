import {EntityProxy} from '../../src/EntityProxy';
import {assert} from 'chai';
import {UnitOfWork} from '../../src/UnitOfWork';
import {Wetland} from '../../src/Wetland';
import {Simple} from '../resource/entity/Simple';
import {Parent} from '../resource/entity/Parent';
import {SimpleDifferent} from '../resource/entity/SimpleDifferent';

function getUnitOfWork(entities?): UnitOfWork {
  let wetland = new Wetland({});

  if (entities) {
    wetland.registerEntities(entities);
  }

  return wetland.getManager().getUnitOfWork();
}

describe('EntityProxy', () => {
  describe('static .patchEntity()', () => {
    it('should patch an entity, and be disabled by default', () => {
      let unitOfWork    = getUnitOfWork();
      let entityManager = unitOfWork.getEntityManager();
      let parent        = new Parent;
      let patched       = EntityProxy.patchEntity(parent, entityManager);

      assert.strictEqual(patched.isEntityProxy, true);
      assert.strictEqual(patched.isProxyingActive(), false);

      unitOfWork.registerClean(patched.getTarget());

      patched.activateProxying();

      assert.strictEqual(patched.isProxyingActive(), true);
    });

    it('should patch the collections on an un-patched entity', () => {
      let unitOfWork = getUnitOfWork([Parent]);
      let parent     = new Parent;
      let patched    = EntityProxy.patchEntity(parent, unitOfWork.getEntityManager());

      assert.strictEqual(patched.simples['isCollectionProxy'], true);
    });

    it('should throw an error when an entity of the wrong type was supplied for one relation', () => {
      let unitOfWork = getUnitOfWork();
      let parent     = new Parent;
      let patched    = EntityProxy.patchEntity(parent, unitOfWork.getEntityManager());
      let simple     = new SimpleDifferent;

      unitOfWork.registerClean(parent);
      patched.activateProxying();

      assert.throws(() => {
        patched.single = simple;
      }, "Can't assign to 'Parent.single'. Expected instance of 'Simple'.");
    });

    it('should throw an error when an entity of the wrong type was supplied for many relation', () => {
      let unitOfWork = getUnitOfWork();
      let parent     = new Parent;
      let patched    = EntityProxy.patchEntity(parent, unitOfWork.getEntityManager());
      let simple     = new SimpleDifferent;

      unitOfWork.registerClean(parent);
      patched.activateProxying();

      assert.throws(() => {
        patched.simples.push(simple);
      }, "Can't add to 'Parent.simples'. Expected instance of 'Simple'.");
    });

    it('should register collection changes when adding an entity to a collection', () => {
      let unitOfWork = getUnitOfWork();
      let parent     = new Parent;
      let patched    = EntityProxy.patchEntity(parent, unitOfWork.getEntityManager());
      let simple     = new Simple;
      let simpleTwo  = new Simple;
      simple.name    = 'hello';
      simpleTwo.name = 'world';
      patched.name   = 'Simple test';

      unitOfWork.registerClean(parent);
      patched.activateProxying();

      assert.deepEqual(unitOfWork.getRelationshipsChangedObjects(), []);

      patched.simples.add(simple);
      patched.simples.add(simpleTwo);

      assert.deepEqual(unitOfWork.getRelationshipsChangedObjects(), [patched]);
    });

    it('should not register collection changes when re-adding an entity to a collection', () => {
      let unitOfWork = getUnitOfWork();
      let parent     = new Parent;
      let simple     = new Simple;
      simple.name    = 'hello';

      parent.simples.push(simple);

      let patched = EntityProxy.patchEntity(parent, unitOfWork.getEntityManager());

      assert.strictEqual(UnitOfWork.STATE_UNKNOWN, UnitOfWork.getObjectState(patched));

      unitOfWork.registerClean(patched);
      patched.activateProxying();

      assert.strictEqual(UnitOfWork.getObjectState(patched), UnitOfWork.STATE_CLEAN);

      // Remove, make it dirty!
      patched.simples.pop();

      assert.isTrue(UnitOfWork.isDirty(patched));

      // Add again, clean it up.
      patched.simples.push(simple);

      assert.isTrue(UnitOfWork.isClean(patched));

      // Some different ways of adding / removing.
      patched.simples.splice(0, patched.simples.length);

      assert.isTrue(UnitOfWork.isDirty(patched));

      patched.simples[0] = simple;

      assert.isTrue(UnitOfWork.isClean(patched));

      delete patched.simples[0];

      assert.isTrue(UnitOfWork.isDirty(patched));
      patched.simples.unshift(simple);

      assert.isTrue(UnitOfWork.isClean(patched));
      assert.strictEqual(UnitOfWork.getObjectState(patched), UnitOfWork.STATE_CLEAN);
    });

    it('should disallow deleting toMany values from entity', () => {
      let unitOfWork = getUnitOfWork();
      let patched    = unitOfWork.getEntityManager().attach(new Parent);

      assert.throws(() => {
        delete patched.simples;
      }, `It is not allowed to delete a collection. Trying to delete 'Parent.simples'.`);
    });
  });
});
