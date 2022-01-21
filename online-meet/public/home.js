const joinMeet = () => {
    let join_meet_form = document.getElementById('join-meet-form');
    let meet_code = document.getElementById('meet-code').value;
    join_meet_form.action = `/${meet_code}`
}