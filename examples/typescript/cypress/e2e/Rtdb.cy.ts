const PROJECTS_PATH = 'projects';

describe('Projects View', () => {
  beforeEach(() => {
    cy.callRtdb('remove', PROJECTS_PATH);
  });

  it('get action Loads RTDB data', () => {
    cy.callRtdb('set', PROJECTS_PATH, { ABC123: { name: 'pushed project' } })
      .then(() => cy.callRtdb('get', PROJECTS_PATH, { limitToLast: 1 }))
      .then((results) => {
        cy.log('results:', results);
        expect(results).to.exist;
      });
  });

  it('Limit to last 1', () => {
    cy.callRtdb('set', PROJECTS_PATH, {
      ABC123: { name: 'pushed project' },
      BCD234: { name: 'other' },
    });
    cy.callRtdb('get', PROJECTS_PATH, { limitToLast: 1 }).then((results) => {
      cy.log('results:', results);
      expect(Object.keys(results)).to.have.length(1);
    });
  });

  it('set', () => {
    cy.callRtdb('set', 'projects/123abc', { name: 'set project' }).then(() => {
      cy.callRtdb('get', 'projects/123abc').then((result) => {
        expect(result).to.exist;
      });
    });
  });

  it('push', () => {
    cy.callRtdb('push', PROJECTS_PATH, { name: 'pushed project' })
      .then(() => cy.callRtdb('get', PROJECTS_PATH))
      .then((result) => {
        expect(result).to.exist;
        expect(result).to.be.an('object');
        expect(Object.keys(result)).to.have.length(1);
      });
  });

  it('push with meta', () => {
    cy.callRtdb(
      'push',
      PROJECTS_PATH,
      { name: 'pushed project' },
      { withMeta: true },
    ).then((pushKey) => {
      cy.log('results:', pushKey);
      cy.callRtdb('get', `projects/${pushKey}`).then((result) => {
        expect(result).to.exist;
        expect(result).to.have.property('createdAt');
      });
    });
  });

  it('works with tasks', () => {
    cy.callRtdb('push', PROJECTS_PATH, { name: 'pushed project' })
      .then(() => cy.task('callRtdb', { action: 'get', path: PROJECTS_PATH }))
      .then((result) => {
        expect(result).to.exist;
        expect(result).to.be.an('object');
      });
  });
});
