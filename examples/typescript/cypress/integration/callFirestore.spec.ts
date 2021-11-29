
describe('cy.callFirestore', () => {
  it('is attached to cypress custom commands', () => {
    expect(cy.callFirestore).to.be.a('function')
  })

  describe('get action', () => {
    it('gets data from Firestore', () => {
      const projectData = { some: 'value' }
      cy.callFirestore('set', 'projects/test-project', projectData)
        .then(() => cy.callFirestore('get', 'projects/test-project'))
        .then((project) => {
          expect(project).to.equal(projectData)
        })
    })

    it('gets data from Firestore with where option', () => {
      const projectData = { some: 'value', uid: '_TEST_WhereUid' }
      Promise.all([
        cy.callFirestore('set', 'projects/test-where-project', projectData),
        cy.callFirestore('set', 'projects/test-where-project-2', projectData)
      ])
        .then(() => cy.callFirestore('get', 'projects', {
          where: ['uid', '==', projectData.uid]
        }))
        .then((projects) => {
          expect(projects).to.have('length', '2')
        })
    })
  })

  describe('set action', () => {
    it('writes data to Firestore', () => {
      cy.callFirestore('set', 'projects/test-project').then(() => {
        return cy.callFirestore('get', 'projects/test-project')
      }).then((project) => {
        expect(project).to.be.an('object')
      })
    })

    it('supports merging', () => {
      cy.callFirestore('set', 'projects/test-project').then(() => {
        return cy.callFirestore('get', 'projects/test-project')
      }).then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('update action', () => {
    it('writes data to Firestore', () => {
      const projectUpdate = { other: 'value' }
      cy.callFirestore('update', 'projects/test-project', projectUpdate).then(() => {
        return cy.callFirestore('get', 'projects/test-project')
      }).then((project) => {
        expect(project).to.have.property('other', projectUpdate.other)
      })
    })
  })

  describe('delete action', () => {
    it('removes data from Firestore', () => {
      const projectData = { some: 'value' }
      cy.callFirestore('set', 'projects/test-project', projectData).then(() => {
        return cy.callFirestore('delete', 'projects/test-project')
      }).then(() => {
        return cy.callFirestore('get', 'projects/test-project')
      }).then((project) => {
        expect(project).to.not.be.an('object')
      })
    })
  })
})
