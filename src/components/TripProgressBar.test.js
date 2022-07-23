/* globals test, expect, afterEach */

import React from 'react';
import TripProgressBar from './TripProgressBar';
import { render, screen } from '@testing-library/react';
const tripFixture = require('../fixtures/trips-270708.json');
const tripUpdatesFixture = require('../fixtures/trip_updates.json');
const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
});

test('renders TripProgressBar', () => {
  Date.now = () => Date.parse('2022-07-22 22:10:00');
  const tripUpdates = tripUpdatesFixture.filter((i) => i.trip_update.trip.trip_id === tripFixture.trip_gid);
  const {container} = render(
    <TripProgressBar trip={tripFixture} tripUpdates={tripUpdates} />
  );
  expect(container.querySelector('.trip-progress-bar > .progress > div')).toHaveStyle({width: '17.551%'});
  expect(screen.getByText('2.44 mi')).toBeInTheDocument();
});

test('renders TripProgressBar for completed trip', () => {
  Date.now = () => Date.parse('2022-07-22 23:40:00');
  const {container} = render(
    <TripProgressBar trip={tripFixture} tripUpdates={[]} />
  );
  expect(container.querySelector('.trip-progress-bar > .progress > div')).toHaveStyle({width: '100%'});
  expect(screen.getByText('13.92 mi')).toBeInTheDocument();
});

test('renders empty TripProgressBar for trip not yet started', () => {
  Date.now = () => Date.parse('2022-07-22 23:45');
  const tripUpdates = tripUpdatesFixture.filter((i) => i.trip_update.trip.trip_id === tripFixture.trip_gid);
  const {container} = render(
    <TripProgressBar trip={tripFixture} tripUpdates={tripUpdates} />
  );
  expect(container.querySelector('.trip-progress-bar-empty')).toBeInTheDocument();
});
