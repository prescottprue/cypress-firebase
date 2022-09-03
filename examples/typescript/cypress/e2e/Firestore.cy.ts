describe('callFirestore', () => {
  describe('get', () => {
    before(() => {
      cy.callFirestore('add', 'projects', { name: 'test' })
    })

    it('should return null for empty collection', () => {
      cy.callFirestore('get', 'asdf').then(results => {
        cy.log('results:', results);
        expect(results).be.null;
      });
    });

    it('should return documents from collection', () => {
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

    it('should query with where', () => {
      const uniqueName = 'Test Where'
      cy.callFirestore('add', 'projects', { name: uniqueName })
      cy.callFirestore('get', 'projects', {
        where: ['name', '==', uniqueName],
      }).then((results) => {
        cy.log('get respond', results);
        expect(results).to.exist;
        expect(results).to.have.length(1);
      });  
    })
  })

  describe('set', () => {
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
  })

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
          value: updatedValue,
        }).then(() => {
          cy.callFirestore('get', 'projects/123ABCUpdate').then(result => {
            expect(result).to.have.exist;
            expect(result).to.have.property('value', updatedValue);
          });
        });
      },
    );
  });

  it('add', () => {
    const newProjectName = `pushed project${Date.now()}`;
    cy.callFirestore('add', 'projects', { name: newProjectName }).then(() => {
      cy.callFirestore('get', 'projects').then((results: { name: string }[]) => {
        cy.log('results:', results);
        expect(
          Object.values(results).filter(
            (project) => project.name === newProjectName,
          ),
        ).to.exist;
      });
    });
  });

  it('should delete collection of documents given collection name', () => {
    cy.callFirestore('delete', 'projects')
    cy.callFirestore('get', 'projects').then((projects) => {
      expect(projects).to.be.null
    });
  });

  it('should delete collection of documents matching a query', () => {
    cy.callFirestore('add', 'projects', { name: 'toDelete' })
    cy.callFirestore('add', 'projects', { name: 'test' })
    cy.callFirestore('delete', 'projects', { where: ['name', '==', 'toDelete'] }).then(() => {
      // Confirm project is deleted
      cy.callFirestore('get', 'projects', { where: ['name', '==', 'toDelete'] }).then((projectsAfterDelete) => {
        expect(projectsAfterDelete).to.be.null
      });
      // Confirm other projects are not deleted
      cy.callFirestore('get', 'projects').then((projectsAfterDelete) => {
        expect(projectsAfterDelete).to.exist
      });
    });
  });
});
