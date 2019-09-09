describe('Typescript', () => {
  it('works', () => {
    // note TypeScript definition
    const x: number = 42
  })

  it('checks shape of an object', () => {
    const object = {
      age: 21,
      name: 'Joe',
    }
    cy.callFirestore('set', 'asdf', { some: 'data' })
  })

  it('uses cy commands', () => {
    cy.wrap({}).should('deep.eq', {})
  })

  it('tests our example site', () => {
    cy.visit('https://example.cypress.io/')
    cy.get('.home-list')
      .contains('Querying')
      .click()
    cy.get('#query-btn').should('contain', 'Button')
  })

  // enable once we release updated TypeScript definitions
  it('has Cypress object type definition', () => {
    expect(Cypress.version).to.be.a('string')
  })

})

describe('Cypress Firebase', () => {
  describe('custom commands', () => {
    describe('cy.callFirestore', () => {
      it('is attached to cypress custom commands', () => {
        expect(cy.callFirestore).to.be.a('function')
      })

      describe('get action', () => {
        it('gets data from Firestore', () => {
          cy.callFirestore('get', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })

      describe('set action', () => {
        it('writes data to Firestore', () => {
          cy.callFirestore('set', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })

        it('supports merging', () => {
          cy.callFirestore('set', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })

      describe('update action', () => {
        it('writes data to Firestore', () => {
          cy.callFirestore('update', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })

      describe('delete action', () => {
        it('writes data to Firestore', () => {
          cy.callFirestore('update', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })
    })

    describe('cy.callFirestore', () => {
      it('is attached to cypress custom commands', () => {
        expect(cy.callFirestore).to.be.a('function')
      })

      describe('get action', () => {
        it('gets data from Firestore', () => {
          cy.callFirestore('get', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })

      describe('set action', () => {
        it('writes data to Firestore', () => {
          cy.callFirestore('set', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })

        it('supports merging', () => {
          cy.callFirestore('set', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })

      describe('update action', () => {
        it('writes data to Firestore', () => {
          cy.callFirestore('update', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })

      describe('delete action', () => {
        it('writes data to Firestore', () => {
          cy.callFirestore('update', 'projects/test-project').then((project) => {
            expect(project).to.be.an('object')
          })
        })
      })
    })
  })
})
