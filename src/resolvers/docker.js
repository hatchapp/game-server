const { Docker } = require('node-docker-api');
const hostname = require('os').hostname();

function getImage(container){
	return container.data.Image;
}

function getNetwork(container, network){
	return container.data.NetworkSettings.Networks[network];
}
/**
 * Given some configurations, finds the docker containers to use as swim base servers
 * @param port the port the containers use for the swim
 * @param image the image name the containers use
 * @param network the name of the network the hashring peers are connected to
 * @param me ip address of this server in the docker
 * @param socketPath socket path of the docker
 * @returns {{resolve: Function}}
 */
module.exports = function({ port, image, network, me, socketPath = '/var/run/docker.sock' }){
	const docker = new Docker({ socketPath });

	async function resolve(){
		const containers = await docker.container.list();

		return containers.filter((container) => {
			try {
				// ignore this container itself
				if(container.data.Id.startsWith(hostname)) return false;
				const net = getNetwork(container, network);
				return getImage(container) === image;
			}catch(err){
				return false;
			}
		}).map((container) => {
			const net = getNetwork(container, network);

			return `${net.IPAddress.trim()}:${port}`;
		});
	}

	return {
		resolve,
	};
};
