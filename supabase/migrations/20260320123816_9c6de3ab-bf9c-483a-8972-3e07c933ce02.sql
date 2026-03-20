
-- Allow authenticated users to update their own subscriptions
CREATE POLICY "Users update own subscriptions"
ON public.subscriptions
FOR UPDATE
USING (user_id = get_my_profile_id());

-- Allow authenticated users to delete their own subscriptions
CREATE POLICY "Users delete own subscriptions"
ON public.subscriptions
FOR DELETE
USING (user_id = get_my_profile_id());
