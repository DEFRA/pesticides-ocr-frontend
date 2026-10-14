// GTM events for the journey milestones (EQ-533), named as in the GTM triggers.
export const analyticsEvents = {
  journeyStart: 'journey_start',
  journeyNotEligible: 'journey_not_eligible',
  registrationComplete: 'registration_complete'
}

// Pages carrying an event aren't cached, so Back or a restored tab asks the
// server again (which then sends no event) instead of replaying the old page.
export const milestonePageCache = { otherwise: 'no-store' }
