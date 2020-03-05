describe('Firestore', () => {
  it('get', () => {
    cy.callFirestore('get', 'projects').then(results => {
      cy.log('results:', results);
      expect(results).to.exist;
    });
  });

  it('get with limit', () => {
    cy.callFirestore('get', 'projects', { limit: 1 }).then(results => {
      cy.log('results:', results);
      expect(results).to.exist;
      expect(results).to.have.length(1);
    });
  });

  it('set', () => {
    cy.callFirestore('set', 'projects/123ABC', { some: 'value' }).then(
      results => {
        cy.log('results:', results);
        cy.callFirestore('get', 'projects/123ABC').then(result => {
          expect(result).to.exist;
        });
      },
    );
  });

  it('set with merge', () => {
    cy.callFirestore(
      'set',
      'projects/123ABCSet',
      { some: 'value' },
      { merge: true },
    ).then(results => {
      cy.log('results:', results);
      cy.callFirestore('get', 'projects/123ABCSet').then(result => {
        expect(result).to.exist;
        expect(result).to.have.property('some', 'value');
      });
    });
  });

  it('update non-existing throws', () => {
    const updatedValue = 'asdfasdf';
    expect(() => {
      cy.callFirestore('update', 'projects/123ABC', { updatedValue });
    }).to.Throw;
  });

  it('update', () => {
    const updatedValue = 'asdfasdf';
    cy.callFirestore('set', 'projects/123ABCUpdate', { some: 'value' }).then(
      () => {
        cy.callFirestore('update', 'projects/123ABCUpdate', {
          updatedValue,
        }).then(() => {
          cy.callFirestore('get', 'projects/123ABCUpdate').then(result => {
            expect(result).to.have.exist;
            expect(result).to.have.property('updatedValue', updatedValue);
          });
        });
      },
    );
  });

  it('add', () => {
    const newProjectName = `pushed project${Date.now()}`;
    cy.callFirestore('add', 'projects', { name: newProjectName }).then(() => {
      cy.callFirestore('get', 'projects').then(results => {
        cy.log('results:', results);
        expect(
          Object.values(results).filter(
            project => project.name === newProjectName,
          ),
        ).to.exist;
      });
    });
  });
});
