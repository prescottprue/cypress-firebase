
describe('cy.callRtdb', () => {
  it('is attached to cypress custom commands', () => {
    expect(cy.callRtdb).to.be.a('function')
  })

  describe('get action', () => {
    it('gets data from RTDB', () => {
      cy.callRtdb('get', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('set action', () => {
    it('writes data to RTDB', () => {
      cy.callRtdb('set', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('update action', () => {
    it('writes data to Firestore', () => {
      cy.callRtdb('update', 'projects/test-project').then((project) => {
        expect(project).to.be.an('object')
      })
    })
  })

  describe('remove action', () => {
    it('writes data to Firestore', () => {
      cy.callRtdb('remove', 'projects/test-project')
    })
  })
})
