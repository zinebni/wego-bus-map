import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import NoMatch from './NoMatch';
import TitleBar from '../components/TitleBar';
import LoadingScreen from '../components/LoadingScreen';
import TransitMap from '../components/TransitMap';
import { getJSON, formatPositionData, formatTripTime } from './../util.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHourglassEnd, faHourglassStart, faMap, faMapSigns, faBus } from '@fortawesome/free-solid-svg-icons';
import StopTimeTableRow from '../components/StopTimeTableRow';
import TripTable from '../components/TripTable';
import Footer from '../components/Footer';
import AlertList from '../components/AlertList';
import StopTimeSequence from '../components/StopTimeSequence';
import TransitRouteHeader from '../components/TransitRouteHeader';

const GTFS_BASE_URL = process.env.REACT_APP_GTFS_BASE_URL;
const REFRESH_VEHICLE_POSITIONS_TTL = 7 * 1000;
const REFRESH_TRIP_UPDATES_TTL = 60 * 1000;

function Trip() {
  const [route, setRouteData] = useState({});
  const [trip, setRouteTripData] = useState([]);
  const [tripBlock, setTripBlockData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [agencies, setAgencyData] = useState([]);
  const [vehicleMarkers, setVehicleMarkers] = useState([]);
  const [tripUpdates, setTripUpdates] = useState([]);
  const [isRouteLoaded, setRouteLoaded] = useState(false);
  const [isRouteTripLoaded, setRouteTripLoaded] = useState(false);
  const [isAlertLoaded, setAlertLoaded] = useState(false);
  const [isTripUpdateLoaded, setTripUpdateLoaded] = useState(false);
  const [isAgencyLoaded, setAgencyLoaded] = useState(false);
  const [isVehiclePositionLoaded, setVehiclePositionLoaded] = useState(false);
  const [isTripBlockLoaded, setTripBlockLoaded] = useState(false);
  const { pathname } = useLocation();
  const params = useParams();

  // Consolidated check that things are ready to go
  const isUIReady = [
    isRouteLoaded, isRouteTripLoaded, isTripUpdateLoaded,
    isAlertLoaded, isAgencyLoaded, isVehiclePositionLoaded,
    isTripBlockLoaded
  ].every((a) => a === true);

  useEffect(() => {
    // On intra-page navigation, scroll to top and restore lading screen
    window.scrollTo(0, 0);
    setRouteTripLoaded(false);

    getJSON(GTFS_BASE_URL + '/trips/' + params.trip_id + '.json')
      .then((t) => {
        setRouteTripData(t);
        getJSON(GTFS_BASE_URL + '/routes/' + t.route_gid + '.json')

          .then((r) => setRouteData(r))
          .then(() => setRouteLoaded(true));
      })
      .then(() => setRouteTripLoaded(true));

    getJSON(GTFS_BASE_URL + '/trips/' + params.trip_id + '/block.json')
      .then((r) => setTripBlockData(r))
      .then(()=> setTripBlockLoaded(true));

    getJSON(GTFS_BASE_URL + '/agencies.json')
      .then((a) => setAgencyData(a.data))
      .then(() => setAgencyLoaded(true));

    getJSON(GTFS_BASE_URL + '/realtime/alerts.json')
      .then((data) => setAlerts(data))
      .then(() => setAlertLoaded(true));

    getJSON(GTFS_BASE_URL + '/realtime/vehicle_positions.json')
      .then((data) => setVehicleMarkers(formatPositionData(data)))
      .then(() => setVehiclePositionLoaded(true));

    getJSON(GTFS_BASE_URL + '/realtime/trip_updates.json')
      .then((data) => setTripUpdates(data))
      .then(() => setTripUpdateLoaded(true));

    // Refresh position data at set interval
    const refreshPositionsInterval = setInterval(() => {
      if (!isUIReady) {
        return;
      }
      getJSON(GTFS_BASE_URL + '/realtime/vehicle_positions.json')
        .then((data) => setVehicleMarkers(formatPositionData(data)));
    }, REFRESH_VEHICLE_POSITIONS_TTL);

    const refreshTripUpdatesInterval = setInterval(() => {
      if (!isUIReady) {
        return;
      }
      getJSON(GTFS_BASE_URL + '/realtime/trip_updates.json')
        .then((data) => setTripUpdates(data))
        .then(() => setTripUpdateLoaded(true));
    }, REFRESH_TRIP_UPDATES_TTL);

    // Run on unmount
    return () => {
      clearInterval(refreshPositionsInterval);
      clearInterval(refreshTripUpdatesInterval);
    };

  }, [params.trip_id, pathname, isUIReady]);

  if (!isUIReady) {
    return(<LoadingScreen></LoadingScreen>);
  }

  // No matching route
  if (!route || route.status === 404) {
    return(<NoMatch></NoMatch>);
  }

  const routeAlerts = alerts.filter((a) => a.alert.informed_entity[0].route_id === route.route_short_name);

  // Extract stops
  let stops = trip.stop_times;

  // Filter vehicle markers
  const filtered_vehicleMarkers = vehicleMarkers.filter(v => v.metadata.trip.trip_id === trip.trip_gid);

  // Filter updates to this trip, key stop time updates by sequence
  const filteredTripUpdates = tripUpdates.filter((i) => i.id === trip.trip_gid);
  let filteredTripUpdates_by_sequence = {};
  if (filteredTripUpdates.length > 0 && typeof filteredTripUpdates[0].trip_update.stop_time_update !== 'undefined') {
    filteredTripUpdates[0].trip_update.stop_time_update.forEach((item, _i) => {
      filteredTripUpdates_by_sequence[item.stop_sequence] = item;
    });
  }

  // Add route color to shape
  trip.shape['route_color'] = route.route_color;

  return(
    <div>
      <TitleBar></TitleBar>
      <div className="container trip">
        <TransitRouteHeader route={route} alerts={routeAlerts} showRouteType={true}></TransitRouteHeader>
        <table className="table table-vertical">
          <tbody>
            <tr>
              <th className="text-nowrap" style={{width: '130px'}}><FontAwesomeIcon icon={faMap} fixedWidth={true}></FontAwesomeIcon> Trip</th>
              <td>{trip.trip_gid}</td>
            </tr>
            <tr>
              <th className="text-nowrap"><FontAwesomeIcon icon={faBus} fixedWidth={true}></FontAwesomeIcon> Vehicle</th>
              <td>
                {(filtered_vehicleMarkers.length > 0 && filtered_vehicleMarkers[0].metadata.vehicle)
                  ? filtered_vehicleMarkers[0].metadata.vehicle.label
                  : 'None Assigned'
                }
              </td>
            </tr>
            <tr>
              <th className="text-nowrap"><FontAwesomeIcon icon={faMapSigns} fixedWidth={true}></FontAwesomeIcon> Headsign</th>
              <td>{trip.trip_headsign}</td>
            </tr>
            <tr>
              <th><FontAwesomeIcon icon={faHourglassStart} fixedWidth={true}></FontAwesomeIcon> Starts</th>
              <td><StopTimeSequence stopTime={trip.stop_times[0]}></StopTimeSequence> {formatTripTime(trip.start_time)} at {trip.stop_times[0].stop.stop_name}</td>
            </tr>
            <tr>
              <th><FontAwesomeIcon icon={faHourglassEnd} fixedWidth={true}></FontAwesomeIcon> Ends</th>
              <td><StopTimeSequence stopTime={trip.stop_times[trip.stop_times.length - 1]}></StopTimeSequence> {formatTripTime(trip.end_time)} at {trip.stop_times[trip.stop_times.length - 1].stop.stop_name}</td>
            </tr>
          </tbody>
        </table>
        <TransitMap vehicleMarkers={filtered_vehicleMarkers} routes={[route]} agencies={agencies} routeShapes={[trip.shape]} routeStops={stops} alerts={alerts}></TransitMap>
        <AlertList alerts={routeAlerts} routes={[route]}></AlertList>
        <table className="table table-sm small">
          <thead>
            <tr>
              <th>Seq.</th>
              <th>Distance</th>
              <th>Stop</th>
              <th className="bg-dark text-light text-center">Time</th>
            </tr>
          </thead>
          <tbody>
            {trip.stop_times.map((item, _index) => {
              let stopTimeUpdate = (typeof filteredTripUpdates_by_sequence[item.stop_sequence] !== 'undefined') ? filteredTripUpdates_by_sequence[item.stop_sequence] : {};
              return(<StopTimeTableRow key={item.id + '-' + item.stop_sequence} stopTime={item} stopTimeUpdate={stopTimeUpdate}></StopTimeTableRow>);
            })}
          </tbody>
        </table>
        {isTripBlockLoaded &&
          <>
            <h2>Related Trips</h2>
            <TripTable routeTrips={tripBlock} route={route}></TripTable>
          </>
        }
      </div>
      <Footer></Footer>
    </div>
  );
}

export default Trip;
