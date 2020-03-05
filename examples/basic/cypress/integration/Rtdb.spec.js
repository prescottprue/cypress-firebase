describe('Projects View', () => {
  it('Loads RTDB projects', () => {
    cy.callRtdb('get', 'projects', { limitToLast: 1 }).then(results => {
      cy.log('results:', results);
      expect(results).to.exist;
    });
  });
  it('Limit to last 1', () => {
    cy.callRtdb('get', 'projects', { limitToLast: 1 }).then(results => {
      cy.log('results:', results);
      expect(Object.keys(results)).to.have.length(1);
    });
  });

  it('set', () => {
    cy.callRtdb('set', 'projects/123abc', { name: 'set project' }).then(() => {
      cy.callRtdb('get', 'projects/123abc').then(result => {
        expect(result).to.have.exist;
      });
    });
  });

  it('push', () => {
    cy.callRtdb('push', 'projects', { name: 'pushed project' }).then(
      () => {
        cy.callRtdb('get', 'projects/123abc').then(result => {
          expect(result).to.have.exist;
        });
      },
    );
  });

  it('push with meta', () => {
    cy.callRtdb(
      'push',
      'projects',
      { name: 'pushed project' },
      { withMeta: true },
    ).then(results => {
      cy.log('results:', results);
      cy.callRtdb('get', 'projects/123abc').then(result => {
        expect(result).to.have.exist;
        expect(result).to.have.property('createdBy');
      });
    });
  });

  it('works with tasks', () => {
    cy.task(
      'callRtdb',
      { action: 'get', actionPath: 'projects' },
      { timeout: 80000 },
    ).then(result => {
      cy.log('result', result);
    });
  });
});
