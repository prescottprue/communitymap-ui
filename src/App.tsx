import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useHistory,
  useParams,
} from 'react-router-dom';
import 'semantic-ui-css/semantic.min.css';
import queryString from 'query-string';
import './App.css';
import {
  MapParams,
  ObjectItem,
  ObjectComment,
  EmbedParams,
  InitialAppParams,
} from './types';
import { SplashScreen } from './components/SplashScreen';
import { Maps, MapItem } from './components/Maps';
import { ChatItem } from './components/Chat';
import { UserPage } from './components/UserPage';
import { ControlBar, AuthBar, NavigationBar } from './components/ControlBar';
import {
  useLoadObjects,
  postObject,
  leaveComment,
  voteUp,
  closeObject,
  useLoadSingleObject,
} from './DB';
import * as firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/auth';
import 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';
import { Segment, Modal, Loader } from 'semantic-ui-react';
import { Place } from './components/Place';
import {
  DirectMessageModal,
  DirectMessageDialogs,
} from './components/DirectMessage';
import { useAuth, AuthProvider } from './Auth';

firebase.initializeApp(firebaseConfig);

if (process.env.NODE_ENV === 'production') firebase.analytics();

const embedBasename = '/embed';
const isEmbed = window.location.pathname.indexOf(embedBasename) === 0;
const initialParams: InitialAppParams | null = window.location.search
  ? (queryString.parse(window.location.search, {
      parseNumbers: true,
      parseBooleans: true,
    }) as any)
  : null;
const embedParams: EmbedParams | null = isEmbed
  ? {
      appId: initialParams?.appId as string,
    }
  : null;

const MapObjectRender: React.FC<{
  item: ObjectItem;
  comments?: ObjectComment[];
  votesInfo: { count: number; userVoted: boolean };
}> = ({ item, votesInfo, comments }) => {
  const user = useAuth() || null;
  const router = useHistory();

  switch (item.type) {
    case 'place':
      return (
        <Place
          item={item}
          user={user}
          userVoted={votesInfo?.userVoted}
          votes={votesInfo?.count}
          comments={comments}
          onClick={() => router.push(`/object/${item.id}`)}
          onComment={async (comment) => leaveComment(user, item, comment)}
          onVote={async () => voteUp(user, item)}
        />
      );
    case 'request':
    case 'offer':
    case 'donation':
    case 'chat':
    default:
      return (
        <ChatItem
          item={item}
          user={user}
          userVoted={votesInfo?.userVoted}
          votes={votesInfo?.count}
          comments={comments}
          onClick={() => router.push(`/object/${item.id}`)}
          onComment={async (comment) => leaveComment(user, item, comment)}
          onVote={async () => voteUp(user, item)}
          onClose={async () => closeObject(user, item)}
        />
      );
  }
};

const DetailedObjectRender: React.FC = () => {
  const user = useAuth() || null;
  const { objectId = 'n/a' } = useParams();

  const { object, comments, votesInfo } = useLoadSingleObject(objectId, user);

  if (object === undefined) return <Loader active />;
  if (object === null) return <div>Object not found :(</div>;

  switch (object.type) {
    case 'place':
      return (
        <Place
          expanded
          item={object}
          user={user}
          userVoted={votesInfo?.userVoted || false}
          votes={votesInfo?.count || 0}
          comments={comments || []}
          onComment={async (comment) => leaveComment(user, object, comment)}
          onVote={async () => voteUp(user, object)}
        />
      );
    default:
      return (
        <ChatItem
          expanded
          item={object}
          user={user}
          userVoted={votesInfo?.userVoted || false}
          votes={votesInfo?.count || 0}
          comments={comments || []}
          onComment={async (comment) => leaveComment(user, object, comment)}
          onVote={async () => voteUp(user, object)}
          onClose={async () => closeObject(user, object)}
        />
      );
  }
};

const Home: React.FC = () => {
  const user = useAuth() || null;
  const [mapParams, setMapParams] = useState<MapParams | null>(null);

  const { objects, commentsObj, votesObj } = useLoadObjects(
    mapParams,
    user,
    initialParams?.filterOrigin
  );

  const router = useHistory();

  return (
    <div className="home">
      {initialParams?.canAdd !== false && (
        <ControlBar
          authenticated={!!user}
          onAdd={(item) =>
            postObject(user, mapParams, item, embedParams?.appId)
          }
        />
      )}
      <AuthBar />
      <NavigationBar
        onChangePosition={(lat, lng) => {
          console.log('located', lat, lng);
          setMapParams({
            ...(mapParams || { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 }),
            centerLat: lat,
            centerLng: lng,
          });
        }}
      />
      <Maps
        centerLat={mapParams?.centerLat || initialParams?.centerLat}
        centerLng={mapParams?.centerLng || initialParams?.centerLng}
        onChange={(centerLat, centerLng, minLat, maxLat, minLng, maxLng) =>
          setMapParams({
            centerLat,
            centerLng,
            minLat,
            maxLat,
            minLng,
            maxLng,
          })
        }
      >
        {commentsObj &&
          votesObj &&
          objects.map((it) => (
            <MapItem key={it.id} lat={it.loc.latitude} lng={it.loc.longitude}>
              <Segment raised className="map-item left pointing label">
                <MapObjectRender
                  item={it}
                  votesInfo={votesObj[it.id]}
                  comments={commentsObj[it.id]}
                />
              </Segment>
            </MapItem>
          ))}
      </Maps>
      <Switch>
        <Route path="/object/:objectId">
          <Modal open closeIcon size="tiny" onClose={() => router.push('/')}>
            <Modal.Content scrolling>
              <DetailedObjectRender />
            </Modal.Content>
          </Modal>
        </Route>
        <Route path="/users/:userId">
          <Modal open closeIcon size="tiny" onClose={() => router.push('/')}>
            <Modal.Content scrolling>
              <UserPage />
            </Modal.Content>
          </Modal>
        </Route>
        <Route path="/direct-messages/:dmKey">
          <DirectMessageModal onClose={() => router.push('/')} />
        </Route>
        <Route path="/my-messages">
          <Modal open closeIcon size="tiny" onClose={() => router.push('/')}>
            <Modal.Header>Messages</Modal.Header>
            <Modal.Content scrolling>
              <DirectMessageDialogs />
            </Modal.Content>
          </Modal>
        </Route>
      </Switch>
    </div>
  );
};

function App() {
  const user = useAuth();

  const [splash, setSplash] = useState(true);
  useEffect(() => {
    setTimeout(() => setSplash(false), 2000);
  }, []);

  if (isEmbed) {
    if (!embedParams?.appId)
      return (
        <div>
          Mandatory parameter <strong>appId</strong> is missing. Read
          https://github.com/opencommunitymap/communitymap-ui#embedding for more
          information
        </div>
      );
  }

  if (splash || user === undefined) return <SplashScreen />;

  return <Home />;
}

export default () => (
  <AuthProvider>
    <Router basename={isEmbed ? embedBasename : undefined}>
      <App />
    </Router>
  </AuthProvider>
);
