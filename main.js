let canvas_width = 128;
let canvas_height = canvas_width;

let win_amount = 0.1;
let lose_amount = -0.1;
let other_amount = -0.03;
let idle_amount = 0.01;
let extra_noise_amount = 0.0;
let iteration_count = 3;
let sample_count = 1;

let use_new_version = false;

let sys = {
	curr_time: 0,
	buffers: [[], []],
	curr_buffer: [],
	next_buffer: [],
};

let canvas;
let ctx;
let pixels;

function main() {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d", {willReadFrequently: true});
	register_events();
	window_resize();
	sys.start_time = Date.now();
	sys.curr_time = sys.start_time;
	init_slots();
	render();
}
function register_events() {
	window.addEventListener("resize", window_resize);
}
function window_resize(event) {
	resize_canvas();
}
function resize_canvas() {
	canvas.width = canvas_width;
	canvas.height = canvas_height;
}
function render() {
	sys.curr_time = Date.now();

	ctx.clearColor = "rgba(0,0,0,0)";
	ctx.clearRect(0,0, canvas.width, canvas.height);

	swap_buffers();
	if (use_new_version) {
		calculate_next_frame();
	}
	else {
		calculate_next_frame_old();
	}

	pixels = ctx.getImageData(0,0, canvas.width, canvas.height);

	for (let i = 0; i < sys.curr_buffer.slots.length; i += sys.curr_buffer.choice_count) {
		let slot = get_slot(sys.curr_buffer, i);
		let index = Math.floor(i / sys.curr_buffer.choice_count);
		let x = index % canvas.width;
		let y = Math.floor(index / canvas.width);
		pixels.data[index*4+0] = slot[1] * 255;
		pixels.data[index*4+1] = slot[2] * 255;
		pixels.data[index*4+2] = slot[3] * 255;
		pixels.data[index*4+3] = 255;
	}

	ctx.putImageData(pixels, 0,0);

	window.requestAnimationFrame(render);
}


const Quantumata_Buffer = {
	width: 0,
	height: 0,
	choice_count: 0,
	slots: null,
	collapsed: null,
};
function make_quantumata_buffer(width, height, choice_count = 4) {
	let buffer = Object.assign({}, Quantumata_Buffer);
	buffer.width = width;
	buffer.height = height;
	buffer.choice_count = choice_count;
	buffer.slots = new Array(buffer.width * buffer.height * buffer.choice_count).fill(0.0);
	buffer.collapsed = new Array(buffer.width * buffer.height).fill(0);
	return buffer;
}
function clear_buffer(buffer) {
	for (let i = 0; i < buffer.slots.length; i += 1) {
		buffer.slots[i] = 0.0;
	}
}
function copy_buffers(a, b) {
	for (let i = 0; i < a.slots.length; i += 1) {
		b.slots[i] = a.slots[i];
	}
}
function normalize_probabilities(probabilities) {
	{
		let total = 0.0;
		for (let j = 0; j < probabilities.length; j += 1) {
			if (probabilities[j] < 0.0) {
				total += probabilities[j];
			}
		}
		for (let j = 0; j < probabilities.length; j += 1) {
			probabilities[j] += -total;
		}
	}
	{
		let total = 0.0;
		for (let j = 0; j < probabilities.length; j += 1) {
			total += probabilities[j];
		}
		let total_reciprocal = 1 / total;
		for (let j = 0; j < probabilities.length; j += 1) {
			probabilities[j] *= total_reciprocal;
		}
	}
}
function normalize_buffer(buffer) {
	for (let i = 0; i < buffer.slots.length; i += buffer.choice_count) {
		let total = 0.0;
		for (let j = 0; j < buffer.choice_count; j += 1) {
			if (buffer.slots[i + j] < 0.0) {
				total += buffer.slots[i + j];
			}
		}
		for (let j = 0; j < buffer.choice_count; j += 1) {
			buffer.slots[i + j] += -total;
		}
	}
	for (let i = 0; i < buffer.slots.length; i += buffer.choice_count) {
		let total = 0.0;
		for (let j = 0; j < buffer.choice_count; j += 1) {
			total += buffer.slots[i + j];
		}
		let total_reciprocal = 1 / total;
		for (let j = 0; j < buffer.choice_count; j += 1) {
			buffer.slots[i + j] *= total_reciprocal;
		}
	}
}
function get_slot(buffer, index) {
	let results = new Array(buffer.choice_count);
	for (let i = 0; i < buffer.choice_count; i += 1) {
		results[i] = buffer.slots[index + i];
	}
	return results;
}

function init_slots() {
	sys.buffers = new Array(2);
	sys.buffers[0] = make_quantumata_buffer(canvas.width, canvas.height);
	sys.buffers[1] = make_quantumata_buffer(canvas.width, canvas.height);
	sys.buffer_index = 0;
	sys.curr_buffer = sys.buffers[sys.buffer_index];
	sys.next_buffer = sys.buffers[sys.buffer_index+1];
	init_sources();
}
function init_sources() {
	init_three_centers(sys.curr_buffer);
	copy_buffers(sys.curr_buffer, sys.next_buffer);
}
function init_three_centers(buffer) {
	for (let i = 0; i < buffer.slots.length; i += buffer.choice_count) {
		let nothing_amount = 0.999;
		let everything_amount = 1.0 - nothing_amount;
		let something_amount = everything_amount / (buffer.choice_count-1);
		buffer.slots[i] = nothing_amount;
		for (let j = 1; j < buffer.choice_count; j += 1) {
			buffer.slots[i + j] = something_amount;
		}
	}
	let x = Math.floor(canvas.width / 3);
	let y = Math.floor(canvas.height / 3);
	let index = y * canvas.width + x;
	buffer.slots[index*buffer.choice_count+1] = 0.9;
	x = Math.floor(canvas.width / 3) * 2;
	y = Math.floor(canvas.height / 3);
	index = y * canvas.width + x;
	buffer.slots[index*buffer.choice_count+2] = 0.9;
	x = Math.floor(canvas.width / 2);
	y = Math.floor(canvas.height / 3) * 2;
	index = y * canvas.width + x;
	buffer.slots[index*buffer.choice_count+3] = 0.9;
	normalize_buffer(buffer);
}
function init_random(buffer) {
	for (let i = 0; i < buffer.slots.length; i += 1) {
		buffer.slots[i] = Math.random();
	}
	normalize_buffer(buffer);
}
function swap_buffers() {
	sys.buffer_index = (sys.buffer_index + 1) % 2;
	sys.curr_buffer = sys.buffers[sys.buffer_index];
	let next_index = (sys.buffer_index + 1) % 2;
	sys.next_buffer = sys.buffers[next_index];
	// clear_buffer(sys.next_buffer);
	copy_buffers(sys.curr_buffer, sys.next_buffer);
}
function calculate_next_frame() {
	let choice_count = sys.curr_buffer.choice_count;
	let max_index = sys.curr_buffer.slots.length / choice_count;
	for (let i = 0; i < max_index; i += 1) {
		let x = i % canvas.width;
		let y = Math.floor(i / canvas.width);
		let probabilities = get_slot(sys.curr_buffer, i);

		let up_left_index  = get_slot_2d_index(sys.curr_buffer, x-1, y-1);
		let up_index       = get_slot_2d_index(sys.curr_buffer, x-0, y-1);
		let up_right_index = get_slot_2d_index(sys.curr_buffer, x+1, y-1);

		let left_index  = get_slot_2d_index(sys.curr_buffer, x-1, y-0);
		let self_index  = get_slot_2d_index(sys.curr_buffer, x-0, y-0);
		let right_index = get_slot_2d_index(sys.curr_buffer, x+1, y-0);

		let down_left_index  = get_slot_2d_index(sys.curr_buffer, x-1, y+1);
		let down_index       = get_slot_2d_index(sys.curr_buffer, x-0, y+1);
		let down_right_index = get_slot_2d_index(sys.curr_buffer, x+1, y+1);

		let neighbor_indexes = [
		                        up_left_index,   up_index,   up_right_index,
		                        left_index,      self_index, right_index,
		                        down_left_index, down_index, down_right_index,
		                       ];

		let neighbor_weights = [
		                        0.5, 0.5, 0.5,
		                        0.5, 1.0, 0.5,
		                        0.5, 0.5, 0.5,
		                       ];

		let self_weights = [
		                    0.2, 0.2, 0.2,
		                    0.2, 1.0, 0.2,
		                    0.2, 0.2, 0.2,
		                   ];

		let self_probabilities = new Array(choice_count).fill(0.0);
		for (let j = 0; j < choice_count; j += 1) {
			for (let k = 0; k < neighbor_indexes.length; k += 1) {
				self_probabilities[j] += sys.curr_buffer.slots[neighbor_indexes[k] * choice_count + j] * self_weights[k];
			}
		}
		normalize_probabilities(self_probabilities);

		let neighbor_probabilities = new Array(choice_count).fill(0.0);
		for (let j = 0; j < choice_count; j += 1) {
			for (let k = 0; k < neighbor_indexes.length; k += 1) {
				neighbor_probabilities[j] += sys.curr_buffer.slots[neighbor_indexes[k] * choice_count + j] * neighbor_weights[k];
			}
		}
		normalize_probabilities(neighbor_probabilities);

		for (let j = 0; j < iteration_count; j += 1) {
			let slot_samples = new Array(sample_count);
			let other_slot_samples = new Array(sample_count);
			for (let k = 0; k < sample_count; k += 1) {
				slot_samples[k] = collapse(self_probabilities);
				other_slot_samples[k] = collapse(neighbor_probabilities);
			}
			let slot = get_median(slot_samples);
			let other_slot = get_median(other_slot_samples);

			if (slot == 0) {
				sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
				sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
			}
			else if (slot == 1) {
				if (other_slot == 2) {
					sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
					sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
					sys.next_buffer.slots[i*choice_count + 3] += other_amount;
				}
				else {
					// sys.next_buffer.slots[i*choice_count + 0] += idle_amount;
					sys.next_buffer.slots[i*choice_count + slot] += idle_amount;
				}
			}
			else if (slot == 2) {
				if (other_slot == 3) {
					sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
					sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
					sys.next_buffer.slots[i*choice_count + 1] += other_amount;
				}
				else {
					// sys.next_buffer.slots[i*choice_count + 0] += idle_amount;
					sys.next_buffer.slots[i*choice_count + slot] += idle_amount;
				}
			}
			else if (slot == 3) {
				if (other_slot == 1) {
					sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
					sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
					sys.next_buffer.slots[i*choice_count + 2] += other_amount;
				}
				else {
					// sys.next_buffer.slots[i*choice_count + 0] += idle_amount;
					sys.next_buffer.slots[i*choice_count + slot] += idle_amount;
				}
			}
		}
	}
	add_noise(sys.next_buffer, extra_noise_amount);
	normalize_buffer(sys.next_buffer);
}
function calculate_next_frame_old() {
	let choice_count = sys.curr_buffer.choice_count;
	// sys.curr_buffer.collapsed.fill(0);
	for (let i = 0; i < sys.curr_buffer.slots.length; i += choice_count) {
		let probabilities = get_slot(sys.curr_buffer, i);
		let samples = new Array(sample_count);
		for (let j = 0; j < sample_count; j += 1) {
			samples[j] = collapse(probabilities);
		}
		let index = Math.floor(i / sys.curr_buffer.choice_count);
		sys.curr_buffer.collapsed[index] = get_median(samples);
	}
	for (let i = 0; i < sys.curr_buffer.collapsed.length; i += 1) {
		let slot = sys.curr_buffer.collapsed[i];
		let x = i % canvas.width;
		let y = Math.floor(i / canvas.width);

		let up_left  = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x-1, y-1)];
		let up       = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x-0, y-1)];
		let up_right = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x+1, y-1)];

		let left  = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x-1, y-0)];
		let self  = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x-0, y-0)];
		let right = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x+1, y-0)];

		let down_left  = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x-1, y+1)];
		let down       = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x-0, y+1)];
		let down_right = sys.curr_buffer.collapsed[get_slot_2d_index(sys.curr_buffer, x+1, y+1)];

		let neighbors = [
		                 up_left,   up,   up_right,
		                 left,            right,
		                 down_left, down, down_right,
		                ];

		/**/
		let random_index = Math.floor(Math.random() * neighbors.length);
		let random = neighbors[random_index];
		let other_slot = random;
		/**/

		/*
		let median = get_median(neighbors);
		let other_slot = median;
		*/

		/*
		let random_indexes = many_randoms(3, neighbors.length);
		let randoms = get_many_by_index(neighbors, random_indexes);
		let random_median = get_median(randoms);
		let other_slot = random_median;
		*/

		if (other_slot == -1) {
			let k = 1;
		}
		if (slot == 0) {
			sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
			sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
		}
		else if (slot == 1) {
			if (other_slot == 2) {
				sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
				sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
				sys.next_buffer.slots[i*choice_count + 3] += other_amount;
			}
			else {
				// sys.next_buffer.slots[i*choice_count + 0] += idle_amount;
				sys.next_buffer.slots[i*choice_count + slot] += idle_amount;
			}
		}
		else if (slot == 2) {
			if (other_slot == 3) {
				sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
				sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
				sys.next_buffer.slots[i*choice_count + 1] += other_amount;
			}
			else {
				// sys.next_buffer.slots[i*choice_count + 0] += idle_amount;
				sys.next_buffer.slots[i*choice_count + slot] += idle_amount;
			}
		}
		else if (slot == 3) {
			if (other_slot == 1) {
				sys.next_buffer.slots[i*choice_count + slot] += lose_amount;
				sys.next_buffer.slots[i*choice_count + other_slot] += win_amount;
				sys.next_buffer.slots[i*choice_count + 2] += other_amount;
			}
			else {
				// sys.next_buffer.slots[i*choice_count + 0] += idle_amount;
				sys.next_buffer.slots[i*choice_count + slot] += idle_amount;
			}
		}
	}
	// add_noise(sys.next_buffer, extra_noise_amount);
	normalize_buffer(sys.next_buffer);
}
function add_noise(buffer, amount) {
	for (let i = 0; i < buffer.slots.length; i += buffer.choice_count) {
		for (let j = 0; j < buffer.choice_count; j += 1) {
			let random = Math.random() * amount;
			buffer.slots[i + j] += random;
		}
	}
}
function get_slot_2d(buffer, x, y) {
	let index = get_slot_2d_index(x, y);
	return get_slot(buffer, index * buffer.choice_count);
}
function get_slot_2d_index(buffer, x, y) {
	if (x < 0) {
		x += (Math.floor(Math.abs(x) / canvas.width) + 1) * canvas.width;
	}
	else if (x >= canvas.width) {
		x -= Math.floor(Math.abs(x) / canvas.width) * canvas.width;
	}
	if (y < 0) {
		y += (Math.floor(Math.abs(y) / canvas.height) + 1) * canvas.height;
	}
	else if (y >= canvas.height) {
		y -= Math.floor(Math.abs(y) / canvas.height) * canvas.height;
	}
	return y * canvas.width + x;
}
// probabilities are expected to be normalized
function collapse(probabilities) {
	let random = Math.random();
	let cursor = 0.0;
	for (let i = 0; i < probabilities.length; i += 1) {
		cursor += probabilities[i];
		if (cursor >= random) {
			return i;
		}
	}
	return -1;
}
function collapse_many(arr) {
	let results = new Array(arr.length);
	for (let i = 0; i < arr.length; i += 1) {
		let slot = arr[i];
		results[i] = collapse(slot);
	}
	return results;
}
function get_median(arr) {
	let histogram = get_histogram(arr);
	let keys = Object.keys(histogram);
	let max_key = 0;
	let max_value = 0;
	for (let i = 0; i < keys.length; i += 1) {
		let key = keys[i];
		let value = histogram[key];
		if (key == "0") {
			continue;
		}
		if (value > max_value) {
			max_key = key;
			max_value = value;
		}
	}
	return parseInt(max_key);
}
function get_histogram(arr) {
	let buckets = {};
	for (let i = 0; i < arr.length; i += 1) {
		let value = arr[i];
		if (!buckets.hasOwnProperty(value)) {
			buckets[value] = 1;
		}
		else {
			buckets[value] += 1;
		}
	}
	return buckets;
}
function top_n_from(count, arr) {
	let results = new Array(count).fill(0);
	let max_values = new Array(count).fill(0);
	let histogram = get_histogram(arr);
	let keys = Object.keys(histogram);
	for (let i = 0; i < keys.length; i += 1) {
		let key = keys[i];
		let value = histogram[key];
		if (value > results[0]) {
			for (let j = 0; j < count-1; j += 1) {
				max_values[j+1] = max_values[j];
				results[j+1] = results[j];
			}
			max_values[0] = value;
			results[0] = parseInt(key);
		}
	}
	return results;
}
function get_many_by_index(arr, indexes) {
	let results = new Array(indexes.length);
	for (let i = 0; i < indexes.length; i += 1) {
		let index = indexes[i];
		results[i] = arr[index];
	}
	return results;
}
function many_randoms(count, max) {
	let results = new Array(count);
	for (let i = 0; i < count; i += 1) {
		results[i] = Math.floor(Math.random() * max);
	}
	return results;
}

main();